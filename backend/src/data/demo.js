/**
 * Тестовый пользователь и записи только для демо-прототипа (без БД).
 * Вход: demo@vet.local / demo123
 */

const DEMO_USER = {
  id: 1,
  email: "demo@vet.local",
  password: "demo123",
  fullName: "Иванов Алексей Петрович",
  phone: "+375 (29) 123-45-67",
  roleId: 2,
  role: { id: 2, name: "client" },
};

/** Одна «будущая» запись для виджета на главной */
function buildMockAppointments() {
  const soon = new Date(Date.now() + 1000 * 60 * 60 * 48);
  return [
    {
      id: 101,
      petId: 1,
      veterinarianId: 1,
      serviceId: 1,
      scheduledAt: soon.toISOString(),
      status: "confirmed",
      clientNotes: null,
      createdAt: new Date().toISOString(),
      pet: { id: 1, name: "Барсик", species: "Кот" },
      service: {
        id: 1,
        name: "Первичный осмотр",
        durationMinutes: 30,
        price: "45.00",
      },
      veterinarian: {
        id: 1,
        fullName: "Петрова Мария Ивановна",
        specialization: "Терапия мелких животных",
      },
      _ownerId: 1,
    },
  ];
}

module.exports = { DEMO_USER, buildMockAppointments };
