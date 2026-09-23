const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
/** Пароль для демо-аккаунтов seed (см. .env.example). Меняйте на своей машине при необходимости. */
const DEMO_PASSWORD = "demo123";

/** Демо-услуги: при каждом `npm run db:seed` добавляются только отсутствующие (по точному названию). */
const demoServices = [
  {
    name: "Первичный осмотр",
    description: "Общий осмотр, консультация, рекомендации",
    durationMinutes: 30,
    price: 35.0,
  },
  {
    name: "Повторный приём",
    description: "Контроль после лечения",
    durationMinutes: 20,
    price: 25.0,
  },
  {
    name: "Вакцинация комплексная",
    description: "Прививка по календарю, запись в паспорт",
    durationMinutes: 25,
    price: 42.5,
  },
  {
    name: "Чипирование",
    description: "Введение микрочипа, регистрация",
    durationMinutes: 15,
    price: 55.0,
  },
  {
    name: "УЗИ брюшной полости",
    description: "Ультразвуковое исследование",
    durationMinutes: 45,
    price: 68.0,
  },
  {
    name: "Стрижка когтей",
    description: "Гигиена без анестезии",
    durationMinutes: 15,
    price: 12.0,
  },
  {
    name: "Стационар (сутки)",
    description: "Наблюдение после операции",
    durationMinutes: 1440,
    price: 85.0,
  },
  {
    name: "Экстренный вызов вне графика",
    description: "Выезд или приём ночью/в выходной",
    durationMinutes: 60,
    price: 120.0,
  },
  {
    name: "Консультация дерматолога",
    description: "Кожа, шерсть, аллергии",
    durationMinutes: 40,
    price: 48.0,
  },
  {
    name: "Чистка зубов ультразвуком",
    description: "Снятие зубного камня под седацией при необходимости",
    durationMinutes: 50,
    price: 75.0,
  },
  {
    name: "Стерилизация кошки",
    description: "Операция, премедикация, наблюдение после",
    durationMinutes: 120,
    price: 165.0,
  },
  {
    name: "Кастрация кота",
    description: "Операция, премедикация",
    durationMinutes: 90,
    price: 95.0,
  },
  {
    name: "Общий анализ крови",
    description: "Забор крови, расшифровка врачом",
    durationMinutes: 30,
    price: 38.0,
  },
  {
    name: "Рентген одной зоны",
    description: "Одна проекция, консультация по снимку",
    durationMinutes: 35,
    price: 45.0,
  },
  {
    name: "Ванна и сушка (мелкая порода)",
    description: "Купание, сушка, расчёсывание",
    durationMinutes: 90,
    price: 55.0,
  },
  {
    name: "Обработка от эктопаразитов",
    description: "Капли или спрей, подбор препарата",
    durationMinutes: 20,
    price: 28.0,
  },
  {
    name: "Груминг (машинка)",
    description: "Стрижка под машинку, гигиена",
    durationMinutes: 75,
    price: 62.0,
  },
  {
    name: "Консультация по питанию",
    description: "Рацион, перевод на корм, вес",
    durationMinutes: 35,
    price: 32.0,
  },
  {
    name: "ЭКГ под седацией",
    description: "Снятие кардиограммы, описание",
    durationMinutes: 40,
    price: 52.0,
  },
  {
    name: "Введение внутривенной капельницы",
    description: "Капельница, контроль состояния",
    durationMinutes: 45,
    price: 44.0,
  },
];

const demoPets = [
  {
    name: "Барсик",
    species: "Кошка",
    breed: "Дворняжка",
    birthDate: new Date("2019-05-01T12:00:00"),
    notes: "Спокойный, кастрирован.",
  },
  {
    name: "Рекс",
    species: "Собака",
    breed: "Лабрадор",
    birthDate: new Date("2021-03-15T12:00:00"),
    notes: "Аллергия на курицу в корме.",
  },
  {
    name: "Мурка",
    species: "Кошка",
    breed: "Мейн-кун",
    birthDate: new Date("2020-11-20T12:00:00"),
    notes: null,
  },
];

/** Дополнительные демо-клиенты с питомцами для более «живой» базы. */
const extendedDemoClients = [
  {
    email: "anna.petrova@vetdemo.local",
    fullName: "Анна Петрова",
    phone: "+375290001101",
    pets: [
      {
        name: "Луна",
        species: "Кошка",
        breed: "Британская короткошёрстная",
        birthDate: new Date("2022-02-11T12:00:00"),
        notes: "Пугливая в клинике, лучше мягкая фиксация.",
      },
      {
        name: "Ричи",
        species: "Собака",
        breed: "Корги",
        birthDate: new Date("2020-06-03T12:00:00"),
        notes: "Склонность к набору веса.",
      },
    ],
  },
  {
    email: "maks.sidorov@vetdemo.local",
    fullName: "Максим Сидоров",
    phone: "+375290001102",
    pets: [
      {
        name: "Грей",
        species: "Собака",
        breed: "Немецкая овчарка",
        birthDate: new Date("2019-09-20T12:00:00"),
        notes: "Послеоперационный контроль суставов.",
      },
      {
        name: "Плюша",
        species: "Кролик",
        breed: "Карликовый",
        birthDate: new Date("2023-01-14T12:00:00"),
        notes: "Чувствителен к стрессу, осмотр в тихой зоне.",
      },
    ],
  },
  {
    email: "elena.kim@vetdemo.local",
    fullName: "Елена Ким",
    phone: "+375290001103",
    pets: [
      {
        name: "Томас",
        species: "Кошка",
        breed: "Сфинкс",
        birthDate: new Date("2021-11-07T12:00:00"),
        notes: "Контроль кожи и питания.",
      },
      {
        name: "Ника",
        species: "Собака",
        breed: "Йоркширский терьер",
        birthDate: new Date("2018-04-30T12:00:00"),
        notes: "Плановая стоматологическая гигиена.",
      },
    ],
  },
];

/** Дополнительные демо-врачи. */
const extendedDemoDoctors = [
  {
    email: "derma@vetdemo.local",
    fullName: "Кристина Сергеева",
    phone: "+375290001201",
    specialization: "Дерматология и аллергология",
    licenseNumber: "DEMO-VET-102",
  },
  {
    email: "surgery@vetdemo.local",
    fullName: "Даниил Орлов",
    phone: "+375290001202",
    specialization: "Хирургия мелких животных",
    licenseNumber: "DEMO-VET-103",
  },
  {
    email: "cardio@vetdemo.local",
    fullName: "Марина Левченко",
    phone: "+375290001203",
    specialization: "Кардиология и интенсивная терапия",
    licenseNumber: "DEMO-VET-104",
  },
];

/** @typedef {{ marker: string, ownerEmail: string, petName: string, vetEmail: string, serviceName: string, daysFromNow: number, hour: number, minute?: number, status: string, clientNotes: string }} ExtendedApptSeed */

/** @type {ExtendedApptSeed[]} */
const extendedAppointments = [
  {
    marker: "EXT_APPT:luna-primary-future",
    ownerEmail: "anna.petrova@vetdemo.local",
    petName: "Луна",
    vetEmail: "doctor@vetdemo.local",
    serviceName: "Первичный осмотр",
    daysFromNow: 2,
    hour: 11,
    minute: 30,
    status: "confirmed",
    clientNotes: "Снижен аппетит 2 дня. EXT_APPT:luna-primary-future",
  },
  {
    marker: "EXT_APPT:richi-nutrition-future",
    ownerEmail: "anna.petrova@vetdemo.local",
    petName: "Ричи",
    vetEmail: "doctor@vetdemo.local",
    serviceName: "Консультация по питанию",
    daysFromNow: 5,
    hour: 16,
    minute: 0,
    status: "pending",
    clientNotes: "Подобрать рацион для снижения веса. EXT_APPT:richi-nutrition-future",
  },
  {
    marker: "EXT_APPT:grey-ekg-past",
    ownerEmail: "maks.sidorov@vetdemo.local",
    petName: "Грей",
    vetEmail: "cardio@vetdemo.local",
    serviceName: "ЭКГ под седацией",
    daysFromNow: -8,
    hour: 13,
    minute: 15,
    status: "completed",
    clientNotes: "Периодическая одышка после нагрузки. EXT_APPT:grey-ekg-past",
  },
  {
    marker: "EXT_APPT:plusha-primary-cancelled",
    ownerEmail: "maks.sidorov@vetdemo.local",
    petName: "Плюша",
    vetEmail: "derma@vetdemo.local",
    serviceName: "Первичный осмотр",
    daysFromNow: 1,
    hour: 9,
    minute: 45,
    status: "cancelled",
    clientNotes: "Перенос из-за поездки. EXT_APPT:plusha-primary-cancelled",
  },
  {
    marker: "EXT_APPT:tomas-derma-past",
    ownerEmail: "elena.kim@vetdemo.local",
    petName: "Томас",
    vetEmail: "derma@vetdemo.local",
    serviceName: "Консультация дерматолога",
    daysFromNow: -16,
    hour: 10,
    minute: 0,
    status: "completed",
    clientNotes: "Шелушение кожи в области шеи. EXT_APPT:tomas-derma-past",
  },
  {
    marker: "EXT_APPT:nika-dental-future",
    ownerEmail: "elena.kim@vetdemo.local",
    petName: "Ника",
    vetEmail: "surgery@vetdemo.local",
    serviceName: "Чистка зубов ультразвуком",
    daysFromNow: 7,
    hour: 12,
    minute: 30,
    status: "confirmed",
    clientNotes: "Плановая чистка по рекомендации врача. EXT_APPT:nika-dental-future",
  },
];

/** @type {{ slug: string, ownerEmail: string, petName: string, vetEmail: string, diagnosis: string, treatmentNotes: string, appointmentMarker?: string }[]} */
const extendedMedicalRecords = [
  {
    slug: "grey-ekg",
    ownerEmail: "maks.sidorov@vetdemo.local",
    petName: "Грей",
    vetEmail: "cardio@vetdemo.local",
    appointmentMarker: "EXT_APPT:grey-ekg-past",
    diagnosis: "Синусовая тахикардия при стресс-тесте, без признаков острой декомпенсации.",
    treatmentNotes:
      "Ограничить интенсивные нагрузки 10 дней, контрольное ЭКГ через 1 месяц. EXT_MED:grey-ekg",
  },
  {
    slug: "tomas-derma",
    ownerEmail: "elena.kim@vetdemo.local",
    petName: "Томас",
    vetEmail: "derma@vetdemo.local",
    appointmentMarker: "EXT_APPT:tomas-derma-past",
    diagnosis: "Контактный дерматит лёгкой степени, без признаков вторичной инфекции.",
    treatmentNotes:
      "Местная обработка 2 раза в день 7 суток, сменить шампунь на гипоаллергенный. EXT_MED:tomas-derma",
  },
];

async function ensureDemoUsersAndPets() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  const clientRole = await prisma.role.findUnique({ where: { name: "client" } });
  const doctorRole = await prisma.role.findUnique({ where: { name: "doctor" } });
  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  if (!clientRole || !doctorRole || !adminRole) {
    throw new Error("Роли не найдены — сначала создан client/doctor/admin в этом же сидере");
  }

  let clientUser = await prisma.user.findUnique({ where: { email: "client@vetdemo.local" } });
  if (!clientUser) {
    clientUser = await prisma.user.create({
      data: {
        email: "client@vetdemo.local",
        passwordHash: hash,
        fullName: "Демо Клиент",
        phone: "+375290000001",
        roleId: clientRole.id,
      },
    });
    console.log("Seed: пользователь client@vetdemo.local (пароль: demo123)");
  }

  let doctorUser = await prisma.user.findUnique({ where: { email: "doctor@vetdemo.local" } });
  if (!doctorUser) {
    doctorUser = await prisma.user.create({
      data: {
        email: "doctor@vetdemo.local",
        passwordHash: hash,
        fullName: "Демо Врач Иван",
        phone: "+375290000002",
        roleId: doctorRole.id,
      },
    });
    console.log("Seed: пользователь doctor@vetdemo.local (пароль: demo123)");
  }

  const vet = await prisma.veterinarian.findUnique({ where: { userId: doctorUser.id } });
  if (!vet) {
    await prisma.veterinarian.create({
      data: {
        userId: doctorUser.id,
        specialization: "Терапия мелких животных",
        licenseNumber: "DEMO-VET-001",
      },
    });
    console.log("Seed: профиль ветеринария для doctor@vetdemo.local");
  }

  const adminExists = await prisma.user.findUnique({ where: { email: "admin@vetdemo.local" } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: "admin@vetdemo.local",
        passwordHash: hash,
        fullName: "Демо Админ",
        phone: "+375290000003",
        roleId: adminRole.id,
      },
    });
    console.log("Seed: пользователь admin@vetdemo.local (пароль: demo123)");
  }

  let petsAdded = 0;
  for (const p of demoPets) {
    const exists = await prisma.pet.findFirst({
      where: { ownerId: clientUser.id, name: p.name },
    });
    if (!exists) {
      await prisma.pet.create({
        data: {
          ownerId: clientUser.id,
          name: p.name,
          species: p.species,
          breed: p.breed,
          birthDate: p.birthDate,
          notes: p.notes,
        },
      });
      petsAdded += 1;
    }
  }
  if (petsAdded > 0) {
    console.log(`Seed: добавлено питомцев для демо-клиента: ${petsAdded}`);
  }
}

/** @typedef {{ marker: string, petName: string, serviceName: string, daysFromNow: number, hour: number, status: string, clientNotes: string }} DemoApptSeed */

/** @param {DemoApptSeed} seed */
async function ensureOneDemoAppointment(seed) {
  const has = await prisma.appointment.findFirst({
    where: { clientNotes: { contains: seed.marker } },
  });
  if (has) return has;

  const vet =
    (await prisma.veterinarian.findFirst({
      where: { user: { email: "doctor@vetdemo.local" } },
    })) ?? (await prisma.veterinarian.findFirst());
  const service = await prisma.service.findFirst({ where: { name: seed.serviceName } });
  const client = await prisma.user.findUnique({ where: { email: "client@vetdemo.local" } });
  if (!vet || !service || !client) return null;

  const pet = await prisma.pet.findFirst({
    where: { ownerId: client.id, name: seed.petName },
  });
  if (!pet) return null;

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + seed.daysFromNow);
  scheduledAt.setHours(seed.hour, 0, 0, 0);

  return prisma.appointment.create({
    data: {
      petId: pet.id,
      veterinarianId: vet.id,
      serviceId: service.id,
      scheduledAt,
      status: seed.status,
      clientNotes: seed.clientNotes,
    },
  });
}

async function ensureDemoAppointments() {
  const client = await prisma.user.findUnique({ where: { email: "client@vetdemo.local" } });
  const serviceFirst = await prisma.service.findFirst();
  if (!client || !serviceFirst) return;

  const petFirst = await prisma.pet.findFirst({ where: { ownerId: client.id } });
  const vet =
    (await prisma.veterinarian.findFirst({
      where: { user: { email: "doctor@vetdemo.local" } },
    })) ?? (await prisma.veterinarian.findFirst());
  if (!petFirst || !vet) return;

  const hasFutureNew = await prisma.appointment.findFirst({
    where: { clientNotes: { contains: "DEMO_SEED_APPOINTMENT:future" } },
  });
  const hasFutureLegacy = await prisma.appointment.findFirst({
    where: {
      OR: [
        { clientNotes: { contains: "ДEMO_SEED_APPOINTMENT" } },
        {
          AND: [
            { clientNotes: { contains: "DEMO_SEED_APPOINTMENT" } },
            { NOT: { clientNotes: { contains: "DEMO_SEED_APPOINTMENT:" } } },
          ],
        },
      ],
    },
  });
  if (!hasFutureNew && !hasFutureLegacy) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 3);
    scheduledAt.setHours(10, 0, 0, 0);
    await prisma.appointment.create({
      data: {
        petId: petFirst.id,
        veterinarianId: vet.id,
        serviceId: serviceFirst.id,
        scheduledAt,
        status: "confirmed",
        clientNotes: "Запись из сида. DEMO_SEED_APPOINTMENT:future",
      },
    });
    console.log("Seed: добавлена демо-запись на приём (через 3 дня)");
  }

  const pastAppts = [
    {
      marker: "DEMO_SEED_APPOINTMENT:barsik-primary",
      petName: "Барсик",
      serviceName: "Первичный осмотр",
      daysFromNow: -21,
      hour: 11,
      status: "completed",
      clientNotes: "Демо: первичный приём. DEMO_SEED_APPOINTMENT:barsik-primary",
    },
    {
      marker: "DEMO_SEED_APPOINTMENT:rex-derma",
      petName: "Рекс",
      serviceName: "Консультация дерматолога",
      daysFromNow: -10,
      hour: 14,
      status: "completed",
      clientNotes: "Чешется, есть подозрение на пищевую аллергию. DEMO_SEED_APPOINTMENT:rex-derma",
    },
    {
      marker: "DEMO_SEED_APPOINTMENT:murka-uzi",
      petName: "Мурка",
      serviceName: "УЗИ брюшной полости",
      daysFromNow: -5,
      hour: 9,
      status: "completed",
      clientNotes: "Профилактика, жалоб нет. DEMO_SEED_APPOINTMENT:murka-uzi",
    },
    {
      marker: "DEMO_SEED_APPOINTMENT:barsik-vacc",
      petName: "Барсик",
      serviceName: "Вакцинация комплексная",
      daysFromNow: -60,
      hour: 10,
      status: "completed",
      clientNotes: "Плановая вакцинация. DEMO_SEED_APPOINTMENT:barsik-vacc",
    },
  ];

  let apptAdded = 0;
  for (const s of pastAppts) {
    const before = await prisma.appointment.findFirst({
      where: { clientNotes: { contains: s.marker } },
    });
    const row = await ensureOneDemoAppointment(s);
    if (row && !before) apptAdded += 1;
  }
  if (apptAdded > 0) {
    console.log(`Seed: добавлены демо-приёмы (завершённые): ${apptAdded}`);
  }
}

/**
 * @param {string} slug уникальный суффикс после DEMO_SEED_MEDICAL:
 * @param {{ petName: string, diagnosis: string, treatmentNotes: string, appointmentMarker?: string }} body
 */
async function ensureDemoMedicalRecord(slug, body) {
  const tag = `DEMO_SEED_MEDICAL:${slug}`;
  const exists = await prisma.medicalRecord.findFirst({
    where: { treatmentNotes: { contains: tag } },
  });
  if (exists) return;

  const vet = await prisma.veterinarian.findFirst({
    where: { user: { email: "doctor@vetdemo.local" } },
  });
  const vetFallback = vet ?? (await prisma.veterinarian.findFirst());
  const client = await prisma.user.findUnique({ where: { email: "client@vetdemo.local" } });
  if (!vetFallback || !client) return;

  let appointmentId = null;
  if (body.appointmentMarker) {
    const ap = await prisma.appointment.findFirst({
      where: { clientNotes: { contains: body.appointmentMarker } },
    });
    if (ap) {
      const taken = await prisma.medicalRecord.findUnique({
        where: { appointmentId: ap.id },
      });
      if (!taken) appointmentId = ap.id;
    }
  }

  const pet = await prisma.pet.findFirst({
    where: { ownerId: client.id, name: body.petName },
  });
  if (!pet) return;

  await prisma.medicalRecord.create({
    data: {
      petId: pet.id,
      veterinarianId: vetFallback.id,
      appointmentId,
      diagnosis: body.diagnosis,
      treatmentNotes: `${body.treatmentNotes}\n${tag}`,
    },
  });
}

async function ensureDemoMedicalRecords() {
  const legacyTag = "DEMO_SEED_MEDICAL";
  const hasLegacy = await prisma.medicalRecord.findFirst({
    where: {
      diagnosis: { contains: legacyTag },
      NOT: { diagnosis: { contains: `${legacyTag}:` } },
    },
  });

  const vet = await prisma.veterinarian.findFirst({
    where: { user: { email: "doctor@vetdemo.local" } },
  });
  const vetFallback = vet ?? (await prisma.veterinarian.findFirst());
  const client = await prisma.user.findUnique({ where: { email: "client@vetdemo.local" } });
  if (!hasLegacy && vetFallback && client) {
    const pet = await prisma.pet.findFirst({ where: { ownerId: client.id } });
    if (pet) {
      await prisma.medicalRecord.create({
        data: {
          petId: pet.id,
          veterinarianId: vetFallback.id,
          diagnosis: `Плановый осмотр: состояние удовлетворительное. ${legacyTag}`,
          treatmentNotes: "Рекомендован контроль через 2 недели при изменении поведения.",
        },
      });
    }
  }

  const seeds = [
    {
      slug: "barsik-primary",
      petName: "Барсик",
      appointmentMarker: "DEMO_SEED_APPOINTMENT:barsik-primary",
      diagnosis:
        "Первичный осмотр: слизистые бледно-розовые, температура в норме, сердечный ритм ритмичный. Подозрений на острые процессы нет.",
      treatmentNotes:
        "Рекомендована профилактическая дегельминтизация по схеме. Повторный осмотр при необходимости.",
    },
    {
      slug: "rex-derma",
      petName: "Рекс",
      appointmentMarker: "DEMO_SEED_APPOINTMENT:rex-derma",
      diagnosis:
        "Аллергический дерматит лёгкой степени, очаги расчёсов на животе. Корреляция с употреблением корма с курицей (анамнез).",
      treatmentNotes:
        "Исключить курицу в рационе на 6–8 недель. Антигистаминное по назначению врача, шампунь с хлоргексидином 2 р/нед. Контроль через 3 недели.",
    },
    {
      slug: "murka-uzi",
      petName: "Мурка",
      appointmentMarker: "DEMO_SEED_APPOINTMENT:murka-uzi",
      diagnosis:
        "УЗИ брюшной полости: органы брюшной полости без очаговых изменений, мочевой пузырь умеренно наполнен.",
      treatmentNotes: "Клинически без патологии. Повторное УЗИ не ранее чем через 12 месяцев при отсутствии жалоб.",
    },
    {
      slug: "barsik-vacc",
      petName: "Барсик",
      appointmentMarker: "DEMO_SEED_APPOINTMENT:barsik-vacc",
      diagnosis: "Вакцинация комплексная перенесена хорошо, реакции в месте введения не отмечено.",
      treatmentNotes: "Вакцина записана в паспорт. Ревакцинация по календарю через 12 мес.",
    },
    {
      slug: "barsik-note",
      petName: "Барсик",
      diagnosis: "Дистанционная консультация по питанию: перевод на корм для кастрированных котов.",
      treatmentNotes:
        "Снижение порции на 10%, контроль веса раз в 2 недели. При рвоте или отказе от еды — очный осмотр.",
    },
    {
      slug: "rex-weight",
      petName: "Рекс",
      diagnosis: "Паллипация живота безболезненна, состояние кожных покровов в период ремиссии дерматита.",
      treatmentNotes: "Продолжать гипоаллергенный рацион. Нагрузка умеренная из-за веса (контроль у владельца).",
    },
  ];

  let added = 0;
  for (const s of seeds) {
    const before = await prisma.medicalRecord.findFirst({
      where: { treatmentNotes: { contains: `DEMO_SEED_MEDICAL:${s.slug}` } },
    });
    await ensureDemoMedicalRecord(s.slug, s);
    if (!before) added += 1;
  }

  const total = await prisma.medicalRecord.count({});
  console.log(`Seed: медкарты — демо-записей в БД всего: ${total}${added > 0 ? ` (новых в этом прогоне: ${added})` : ""}`);
}

async function ensureExtendedUsersAndPets() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  const clientRole = await prisma.role.findUnique({ where: { name: "client" } });
  const doctorRole = await prisma.role.findUnique({ where: { name: "doctor" } });
  if (!clientRole || !doctorRole) return;

  let createdClients = 0;
  let createdDoctors = 0;
  let createdPets = 0;

  for (const c of extendedDemoClients) {
    let user = await prisma.user.findUnique({ where: { email: c.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: c.email,
          passwordHash: hash,
          fullName: c.fullName,
          phone: c.phone,
          roleId: clientRole.id,
        },
      });
      createdClients += 1;
    }
    for (const p of c.pets) {
      const exists = await prisma.pet.findFirst({
        where: { ownerId: user.id, name: p.name },
      });
      if (!exists) {
        await prisma.pet.create({
          data: {
            ownerId: user.id,
            name: p.name,
            species: p.species,
            breed: p.breed,
            birthDate: p.birthDate,
            notes: p.notes,
          },
        });
        createdPets += 1;
      }
    }
  }

  for (const d of extendedDemoDoctors) {
    let user = await prisma.user.findUnique({ where: { email: d.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: d.email,
          passwordHash: hash,
          fullName: d.fullName,
          phone: d.phone,
          roleId: doctorRole.id,
        },
      });
      createdDoctors += 1;
    }
    const vet = await prisma.veterinarian.findUnique({ where: { userId: user.id } });
    if (!vet) {
      await prisma.veterinarian.create({
        data: {
          userId: user.id,
          specialization: d.specialization,
          licenseNumber: d.licenseNumber,
        },
      });
    }
  }

  if (createdClients > 0 || createdDoctors > 0 || createdPets > 0) {
    console.log(
      `Seed: расширенные демо-данные — клиентов: +${createdClients}, врачей: +${createdDoctors}, питомцев: +${createdPets}`,
    );
  }
}

async function ensureExtendedAppointments() {
  let created = 0;
  for (const seed of extendedAppointments) {
    const has = await prisma.appointment.findFirst({
      where: { clientNotes: { contains: seed.marker } },
    });
    if (has) continue;

    const [owner, vetUser, service] = await Promise.all([
      prisma.user.findUnique({ where: { email: seed.ownerEmail } }),
      prisma.user.findUnique({ where: { email: seed.vetEmail } }),
      prisma.service.findFirst({ where: { name: seed.serviceName } }),
    ]);
    if (!owner || !vetUser || !service) continue;

    const [pet, vet] = await Promise.all([
      prisma.pet.findFirst({ where: { ownerId: owner.id, name: seed.petName } }),
      prisma.veterinarian.findUnique({ where: { userId: vetUser.id } }),
    ]);
    if (!pet || !vet) continue;

    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + seed.daysFromNow);
    scheduledAt.setHours(seed.hour, seed.minute ?? 0, 0, 0);

    await prisma.appointment.create({
      data: {
        petId: pet.id,
        veterinarianId: vet.id,
        serviceId: service.id,
        scheduledAt,
        status: seed.status,
        clientNotes: seed.clientNotes,
      },
    });
    created += 1;
  }
  if (created > 0) {
    console.log(`Seed: добавлены расширенные приёмы: ${created}`);
  }
}

async function ensureExtendedMedicalRecords() {
  let created = 0;
  for (const row of extendedMedicalRecords) {
    const tag = `EXT_MED:${row.slug}`;
    const exists = await prisma.medicalRecord.findFirst({
      where: { treatmentNotes: { contains: tag } },
    });
    if (exists) continue;

    const [owner, vetUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: row.ownerEmail } }),
      prisma.user.findUnique({ where: { email: row.vetEmail } }),
    ]);
    if (!owner || !vetUser) continue;

    const [pet, vet] = await Promise.all([
      prisma.pet.findFirst({ where: { ownerId: owner.id, name: row.petName } }),
      prisma.veterinarian.findUnique({ where: { userId: vetUser.id } }),
    ]);
    if (!pet || !vet) continue;

    let appointmentId = null;
    if (row.appointmentMarker) {
      const appt = await prisma.appointment.findFirst({
        where: { clientNotes: { contains: row.appointmentMarker } },
      });
      if (appt) {
        const taken = await prisma.medicalRecord.findUnique({ where: { appointmentId: appt.id } });
        if (!taken) appointmentId = appt.id;
      }
    }

    await prisma.medicalRecord.create({
      data: {
        petId: pet.id,
        veterinarianId: vet.id,
        appointmentId,
        diagnosis: row.diagnosis,
        treatmentNotes: `${row.treatmentNotes}\n${tag}`,
      },
    });
    created += 1;
  }
  if (created > 0) {
    console.log(`Seed: добавлены расширенные медкарты: ${created}`);
  }
}

async function main() {
  const roles = ["client", "doctor", "admin"];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  let added = 0;
  for (const row of demoServices) {
    const exists = await prisma.service.findFirst({
      where: { name: row.name },
    });
    if (!exists) {
      await prisma.service.create({ data: row });
      added += 1;
    }
  }
  if (added > 0) {
    console.log(`Seed: добавлено услуг: ${added} (всего в каталоге демо: ${demoServices.length})`);
  } else {
    console.log("Seed: все демо-услуги уже есть в БД");
  }

  await ensureDemoUsersAndPets();
  await ensureDemoAppointments();
  await ensureDemoMedicalRecords();
  await ensureExtendedUsersAndPets();
  await ensureExtendedAppointments();
  await ensureExtendedMedicalRecords();
}

main()
  .then(() => console.log("Seed: роли и данные готовы"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
