// Google requests are confined to the app-created folder; no arbitrary URL or file ID is accepted from a client.
export class DriveFailure extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}
export function driveApi(accessToken, fetcher = fetch) {
  const deadline = AbortSignal.timeout(45000);
  const request = async (path, init = {}) => {
    const response = await fetcher(
      `https://www.googleapis.com/drive/v3/${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.any([deadline, AbortSignal.timeout(10000)]),
      },
    );
    if (!response.ok)
      throw new DriveFailure(
        response.status === 401
          ? "Google bağlantısını Ayarlar’dan yenileyin."
          : response.status === 403
            ? "Drive izinleri veya depolama alanı işlemi engelledi. Google bağlantısını ve klasörü kontrol edin."
            : "Drive işlemi tamamlanamadı. Yeniden denenecek.",
        response.status,
      );
    return response.json();
  };
  const fields =
    "id,name,mimeType,trashed,webViewLink,appProperties,capabilities(canShare)";
  return {
    reserveId: async () => {
      const result = await request(
        "files/generateIds?count=1&space=drive&type=files",
      );
      if (!result.ids?.[0])
        throw new DriveFailure("Klasör kimliği oluşturulamadı.");
      return result.ids[0];
    },
    getFolder: (id) =>
      request(
        `files/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}`,
      ),
    createFolder: (id, customer) =>
      request(`files?fields=${encodeURIComponent(fields)}`, {
        method: "POST",
        body: JSON.stringify({
          id,
          name: `Apex • ${customer.name} • Teslimler`,
          mimeType: "application/vnd.google-apps.folder",
          appProperties: {
            apexCustomer: customer.id,
            apexPurpose: "deliveries-v1",
          },
        }),
      }),
    permissions: async (id) => {
      const rows = [];
      let page = "";
      do {
        const result = await request(
          `files/${encodeURIComponent(id)}/permissions?pageSize=100&fields=nextPageToken,permissions(id,type,role,emailAddress,deleted)&pageToken=${encodeURIComponent(page)}`,
        );
        rows.push(...(result.permissions || []));
        page = result.nextPageToken || "";
      } while (page);
      return rows;
    },
    updateRole: (id, permissionId, role) =>
      request(
        `files/${encodeURIComponent(id)}/permissions/${encodeURIComponent(permissionId)}?fields=id,type,role,emailAddress`,
        { method: "PATCH", body: JSON.stringify({ role }) },
      ),
    grant: (id, email, role, notify) =>
      request(
        `files/${encodeURIComponent(id)}/permissions?sendNotificationEmail=${notify ? "true" : "false"}&fields=id,type,role,emailAddress`,
        {
          method: "POST",
          body: JSON.stringify({
            type: "user",
            role,
            emailAddress: email,
          }),
        },
      ),
  };
}
export function verifyFolder(file, customerId) {
  if (
    file.trashed ||
    file.mimeType !== "application/vnd.google-apps.folder" ||
    file.appProperties?.apexCustomer !== customerId ||
    file.appProperties?.apexPurpose !== "deliveries-v1"
  )
    throw new DriveFailure(
      "Teslim klasörü doğrulanamadı. Mevcut dosyalara erişim verilmedi.",
      409,
    );
  if (!file.capabilities?.canShare)
    throw new DriveFailure("Bu teslim klasörünü paylaşma yetkisi yok.", 403);
  const url = new URL(
    file.webViewLink || `https://drive.google.com/drive/folders/${file.id}`,
  );
  if (url.protocol !== "https:" || url.hostname !== "drive.google.com")
    throw new DriveFailure("Klasör bağlantısı doğrulanamadı.");
  return url.href;
}
// A server-side lease serializes this workflow for each customer, including permissions writes.
export async function syncDeliveryFolder({
  customer,
  folder,
  drive,
  persistId,
  persistReady,
}) {
  if (customer.archived)
    throw new DriveFailure("Arşivlenen müşterinin klasörü değiştirilmez.", 409);
  let id = folder.file_id;
  if (customer.portal_folder_url && !id)
    throw new DriveFailure(
      "Mevcut elle bağlanan klasör korunuyor. Otomatik paylaşım için önce bu klasörün bağlantısı kontrol edilmeli.",
      409,
    );
  if (!id) {
    id = await drive.reserveId();
    await persistId(id);
  }
  let file;
  try {
    file = await drive.getFolder(id);
  } catch (e) {
    if (e.status !== 404 || folder.status === "ready") throw e;
    try {
      file = await drive.createFolder(id, customer);
    } catch (createError) {
      if (createError.status !== 409) throw createError;
      file = await drive.getFolder(id);
    }
  }
  const url = verifyFolder(file, customer.id);
  if (customer.portal_folder_url && customer.portal_folder_url !== url)
    throw new DriveFailure(
      "Müşterinin klasör bağlantısı değişmiş. Otomatik paylaşım durduruldu.",
      409,
    );
  await persistReady(id, url);
  return { id, url };
}
export async function shareDeliveryFolder({
  fileId,
  email,
  drive,
  authorize,
  markShared,
  role = "reader",
  notify = true,
}) {
  if (!["reader", "writer"].includes(role))
    throw new DriveFailure("Geçersiz paylaşım türü.", 400);
  const normalized = email.trim().toLowerCase();
  if (!(await authorize()))
    throw new DriveFailure(
      "Bu kişinin müşteri erişimi artık etkin değil; Drive paylaşımı yapılmadı.",
      409,
    );
  const list = await drive.permissions(fileId);
  // Never create public/domain permissions or reduce an existing, intentionally broader permission.
  let permission = list.find(
    (p) =>
      !p.deleted &&
      p.type === "user" &&
      p.emailAddress?.toLowerCase() === normalized &&
      [
        "reader",
        "commenter",
        "writer",
        "owner",
        "organizer",
        "fileOrganizer",
      ].includes(p.role),
  );
  if (!permission) {
    if (!(await authorize()))
      throw new DriveFailure(
        "Müşteri erişimi değişti; Drive paylaşımı yapılmadı.",
        409,
      );
    permission = await drive.grant(fileId, normalized, role, notify);
  }
  if (
    permission &&
    role === "writer" &&
    ["reader", "commenter"].includes(permission.role)
  ) {
    if (!(await authorize()))
      throw new DriveFailure("Ekip erişimi değişti; paylaşım yapılmadı.", 409);
    permission = await drive.updateRole(fileId, permission.id, "writer");
  }
  if (!permission?.id)
    throw new DriveFailure("Paylaşım doğrulanamadı. Yeniden denenecek.");
  await markShared(permission.id);
  return permission.id;
}
