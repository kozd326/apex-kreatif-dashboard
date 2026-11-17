// A notification is tied to the event that caused it, not every subsequent edit.
// Resolving/reassigning an item removes it from the recipient's actionable inbox.
export function notificationItems(data, day) {
  const member = data.member?.id;
  if (!member || data.member.role === "client") return [];
  const reads = new Set((data.notificationReads || []).map((r) => r.key));
  const activity = [...(data.activity || [])].sort(
    (a, b) =>
      (a.created_at || "").localeCompare(b.created_at || "") ||
      Number(a.id) - Number(b.id),
  );
  const taskActivity = new Map();
  for (const a of activity) {
    if (a.entity_type !== "apex_tasks") continue;
    const events = taskActivity.get(a.entity_id) || {};
    if (a.action === "INSERT" || a.changes?.assignee_id) events.assignment = a;
    if (a.action === "INSERT" || a.changes?.reviewer_id || a.changes?.status)
      events.review = a;
    taskActivity.set(a.entity_id, events);
  }
  const soon = new Date(day + "T12:00:00Z");
  soon.setUTCDate(soon.getUTCDate() + 2);
  const until = soon.toISOString().slice(0, 10);
  const items = [];
  const add = (item) => items.push({ ...item, read: reads.has(item.key) });
  for (const task of data.tasks || []) {
    if (task.status === "Tamamlandı") continue;
    const events = taskActivity.get(task.id) || {};
    const base = {
      target: "task-detail",
      targetId: task.id,
      title: task.title,
    };
    if (task.assignee_id === member) {
      const event = events.assignment;
      if ((event?.actor_id ?? task.created_by) !== member) {
        add({
          ...base,
          key: `assigned:${task.id}:${event?.id || "initial"}`,
          kind: "assignment",
          label: "Sana atandı",
          detail: "İşi açıp planını ve teslim tarihini kontrol et.",
          date: event?.created_at || task.created_at,
          priority: 3,
        });
      }
      if (task.due_date && task.due_date <= until) {
        const period =
          task.due_date < day
            ? "late"
            : task.due_date === day
              ? "today"
              : "soon";
        add({
          ...base,
          key: `due:${task.id}:${task.due_date}:${period}`,
          kind: "deadline",
          label:
            period === "late"
              ? "Teslim gecikti"
              : period === "today"
                ? "Bugün teslim"
                : "Teslim yaklaşıyor",
          detail: "Teslim tarihi",
          date: task.due_date,
          priority: period === "late" ? 0 : period === "today" ? 1 : 4,
        });
      }
    }
    if (task.reviewer_id === member && task.status === "Kontrolde") {
      add({
        ...base,
        key: `review:${task.id}:${events.review?.id || "initial"}`,
        kind: "review",
        label: "Kontrolün bekleniyor",
        detail:
          "İşi kontrol et; uygunsa tamamla, düzeltme gerekiyorsa not bırak.",
        date: events.review?.created_at || task.updated_at,
        priority: 2,
      });
    }
  }
  for (const comment of data.comments || []) {
    if (!comment.mentions?.includes(member) || comment.created_by === member)
      continue;
    const target = comment.task_id ? "task-detail" : "customer-detail";
    const row = (comment.task_id ? data.tasks : data.customers)?.find(
      (r) => r.id === (comment.task_id || comment.customer_id),
    );
    if (!row) continue;
    add({
      key: `mention:${comment.id}`,
      kind: "mention",
      label: "Bir notta adın geçti",
      title: row.title || row.name,
      detail: comment.body,
      date: comment.created_at,
      target,
      targetId: row.id,
      priority: 3,
    });
  }
  for(const request of data.requests||[]) {
    const customer=data.customers?.find(c=>c.id===request.customer_id&&!c.archived);
    if(!customer||request.status!=='Yeni'||(customer.owner_id&&customer.owner_id!==member))continue;
    add({key:'request:'+request.id,kind:'request',label:'Yeni müşteri talebi',title:request.title,detail:customer.name,date:request.created_at,target:'customer-detail',targetId:customer.id,priority:2});
  }
  for(const review of data.reviews||[]) {
    const delivery=data.deliverables?.find(d=>d.id===review.deliverable_id);
    const customer=data.customers?.find(c=>c.id===delivery?.customer_id&&!c.archived);
    if(!delivery||!customer||review.decision!=='Revizyon istendi'||review.resolved||review.revision!==delivery.revision||(customer.owner_id&&customer.owner_id!==member))continue;
    add({key:'revision:'+review.id,kind:'revision',label:'Müşteri düzeltme bekliyor',title:delivery.title,detail:review.comment,date:review.created_at,target:'customer-detail',targetId:customer.id,priority:2});
  }
  return items.sort(
    (a, b) =>
      Number(a.read) - Number(b.read) ||
      a.priority - b.priority ||
      (b.date || "").localeCompare(a.date || "") ||
      a.key.localeCompare(b.key),
  );
}
