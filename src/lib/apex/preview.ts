import { Dataset, today, monthNow } from "./domain";
export function previewData(): Dataset {
  const members = [
    {
      id: "kaan",
      name: "Kaan Özdemir",
      email: "",
      role: "partner",
      active: true,
    },
    {
      id: "kubilay",
      name: "Kubilay",
      email: "",
      role: "partner",
      active: true,
    },
    {
      id: "muratcan",
      name: "Muratcan",
      email: "",
      role: "partner",
      active: true,
    },
  ] as Dataset["members"];
  const customer = {
    id: "studio",
    name: "Örnek Mimarlık",
    contact_name: "Deniz",
    email: "ornek@example.com",
    phone: "",
    services: ["Sosyal medya", "Çekim"],
    owner_id: "kaan",
    stage: "Anlaşıldı",
    next_follow_up: today(),
    notes: "Örnek müşteri kaydı · ekip içi not",
    portal_note:
      "Bu ay sosyal medya içeriklerinizi ve tanıtım filminizi hazırlıyoruz. Çekim planı, kurgu ilerleyişi ve onay bekleyen teslimler aşağıda.",
    quote_amount: 25000,
    version: 1,
  };
  const project = {
    id: "monthly",
    name: "Kasım içerik üretimi",
    customer_id: "studio",
    service: "Sosyal medya",
    status: "Aktif",
    deadline: today(),
    version: 1,
  };
  const tasks = [
    {
      id: "one",
      title: "Yeni koleksiyon için çekim planını hazırla",
      assignee_id: "kaan",
      reviewer_id: "kubilay",
      status: "Yapılıyor",
      due_date: today(),
      customer_id: "studio",
      project_id: "monthly",
      version: 1,
    },
    {
      id: "two",
      title: "Reels kurgusunu tamamla",
      assignee_id: "kaan",
      reviewer_id: "muratcan",
      status: "Yapılacak",
      due_date: today(),
      customer_id: "studio",
      project_id: "monthly",
      version: 1,
    },
    {
      id: "three",
      title: "Haftalık içerikleri son kontrolden geçir",
      assignee_id: "kaan",
      status: "Kontrolde",
      reviewer_id: "kubilay",
      due_date: null,
      customer_id: "studio",
      version: 1,
    },
    {
      id: "four",
      title: "Web sitesi ana sayfa tasarımı",
      assignee_id: "muratcan",
      status: "Yapılıyor",
      due_date: today(),
      customer_id: "studio",
      waiting_reason: "Marka görselleri bekleniyor",
      follow_up: today(),
      follow_up_owner: "kaan",
      version: 1,
    },
  ];
  return {
    member: members[0],
    members,
    customers: [
      customer,
      {
        ...customer,
        id: "coffee",
        name: "Örnek Coffee",
        services: ["Tasarım"],
        stage: "Teklif verildi",
        owner_id: "kubilay",
      },
      {
        ...customer,
        id: "design",
        name: "Örnek Tasarım",
        services: ["Web sitesi"],
        stage: "Dönüş bekleniyor",
        owner_id: "muratcan",
      },
    ],
    projects: [{ ...project, shared: true }],
    tasks: tasks.map((t, i) => ({
      ...t,
      shared: i < 2,
      customer_note:
        i === 1
          ? "İlk kurgu hazırlanıyor; hazır olduğunda teslim kartından izleyebilirsiniz."
          : "Çekimde kullanılacak alanları birlikte netleştireceğiz.",
    })),
    requests: [
      {
        id: "request-example",
        customer_id: "studio",
        title: "Yeni kampanya için kısa video",
        description:
          "Hafta sonu kampanyası için 15 saniyelik bir duyuru hazırlayabilir miyiz?",
        reference_url: "",
        desired_date: today(),
        status: "Yeni",
        created_at: new Date().toISOString(),
        version: 1,
      },
    ],
    scopes: [
      {
        id: "scope-example",
        customer_id: "studio",
        month: monthNow() + "-01",
        quotas: [
          { kind: "Reels", count: 4 },
          { kind: "Gönderi", count: 8 },
          { kind: "Çekim", count: 1 },
        ],
        note: "Birlikte planladığımız aylık üretim.",
        version: 1,
      },
    ],
    comments: [],
    deliverables: [
      {
        id: "reel",
        title: "Kasım tanıtım filmi",
        kind: "Reels",
        customer_id: "studio",
        project_id: "monthly",
        revision: 1,
        status: "Onay bekliyor",
        shared: true,
        due_date: today(),
        version: 1,
      },
    ],
    reviews: [
      {
        id: "review-example",
        deliverable_id: "reel",
        revision: 1,
        decision: "Yorum",
        comment: "Buradaki başlık biraz daha uzun görünsün.",
        seconds: 18,
        resolved: false,
        created_at: new Date().toISOString(),
      },
    ],
    entities: [{ id: "entity", name: "Örnek işletme" }],
    invoices: [
      {
        id: "invoice",
        direction: "sale",
        entity_id: "entity",
        customer_id: "studio",
        counterparty: "Örnek Mimarlık",
        number: "ÖRNEK-001",
        issue_date: today(),
        net: 20000,
        vat: 4000,
        total: 24000,
        tax_review: false,
        version: 1,
      },
    ],
    cash: [
      {
        id: "cash",
        entity_id: "entity",
        invoice_id: "invoice",
        customer_id: "studio",
        direction: "in",
        amount: 12000,
        entry_date: today(),
        description: "Örnek kısmi tahsilat",
      },
    ],
    expected: [],
    packages: [],
    runs: [],
    events: [
      {
        id: "shoot",
        title: "Yeni koleksiyon çekimi",
        shared: true,
        location: "Müşteri stüdyosu",
        customer_id: "studio",
        kind: "Çekim",
        starts_at:
          new Date(Date.now() + 86400000).toISOString().slice(0, 10) +
          "T13:00:00+03:00",
        ends_at:
          new Date(Date.now() + 86400000).toISOString().slice(0, 10) +
          "T15:00:00+03:00",
        attendees: ["kaan", "kubilay"],
        version: 1,
      },
      {
        id: "meet",
        title: "Haftalık ekip buluşması",
        kind: "Toplantı",
        starts_at: today() + "T17:00:00+03:00",
        ends_at: today() + "T18:00:00+03:00",
        attendees: ["kaan", "kubilay", "muratcan"],
        version: 1,
      },
    ],
    activity: [],
    documents: [],
    calendar: [],
    integration: { google: false, ocr: false, calendarConnected: false },
  };
}
