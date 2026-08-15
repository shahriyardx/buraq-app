import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { generateInstructorId, generateStudentId } from "../src/lib/ids";
import { prisma } from "../src/lib/prisma";

type NewUser = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  phone?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  address?: string;
  bio?: string;
  specialties?: string;
};

async function createUser(u: NewUser) {
  const existing = await prisma.user.findUnique({ where: { email: u.email } });
  if (existing) return existing;

  const id = randomUUID();
  const now = new Date();
  const user = await prisma.user.create({
    data: {
      id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      role: u.role,
      status: "ACTIVE",
      studentId: u.role === "STUDENT" ? generateStudentId() : null,
      instructorId: u.role === "INSTRUCTOR" ? generateInstructorId() : null,
      bio: u.bio,
      specialties: u.specialties,
      phone: u.phone,
      gender: u.gender,
      address: u.address,
      createdAt: now,
      updatedAt: now,
    },
  });

  // better-auth credential account (email+password)
  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await hashPassword(u.password),
      createdAt: now,
      updatedAt: now,
    },
  });

  return user;
}

async function main() {
  // ── Settings ──────────────────────────────────────────────────────────────
  await prisma.schoolSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      name: "Buraq Horse Riding School",
      address: "Equestrian Avenue, Riding District",
      phone: "+1 (555) 010-2040",
      email: "info@buraq-riding.example",
      officeHours: "Mon–Sat, 8:00 AM – 6:00 PM",
      attendanceThreshold: 75,
    },
  });

  await prisma.certificateTemplate.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", signatureName: "School Director" },
  });

  const templates: {
    key: "ENROLLMENT" | "INVOICE" | "CERTIFICATE" | "SUPPORT";
    subject: string;
    body: string;
  }[] = [
    {
      key: "ENROLLMENT",
      subject: "Welcome to {{courseName}} at Buraq Horse Riding School",
      body: "Hi {{studentName}},\n\nYou have been enrolled in {{courseName}}. We look forward to riding with you!\n\n— Buraq Horse Riding School",
    },
    {
      key: "INVOICE",
      subject: "Invoice {{invoiceNumber}} — Buraq Horse Riding School",
      body: "Hi {{studentName}},\n\nPlease find attached invoice {{invoiceNumber}} for {{amount}}, due {{dueDate}}.\n\nThank you.",
    },
    {
      key: "CERTIFICATE",
      subject: "Your certificate for {{courseName}} is ready",
      body: "Hi {{studentName}},\n\nCongratulations on completing {{courseName}}! Your certificate ({{certificateId}}) is attached.",
    },
    {
      key: "SUPPORT",
      subject: "Re: {{subject}} [{{ticketId}}]",
      body: "Hi {{studentName}},\n\nThere is an update on your support ticket {{ticketId}}.",
    },
  ];
  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { key: t.key },
      update: {},
      create: t,
    });
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  const admin = await createUser({
    name: "School Admin",
    email: "admin@buraq.test",
    password: "Admin@12345",
    role: "ADMIN",
  });
  await prisma.user.update({
    where: { id: admin.id },
    data: { isSuperAdmin: true },
  });

  // ── Instructors ───────────────────────────────────────────────────────────
  const instructorData = [
    {
      name: "Sarah Miller",
      email: "sarah@buraq.test",
      specialties: "Horsemanship, Grooming",
      bio: "Certified riding coach with 12 years teaching beginners.",
    },
    {
      name: "James Cole",
      email: "james@buraq.test",
      specialties: "Show Jumping",
      bio: "Former national show-jumping competitor.",
    },
    {
      name: "Elena Petrova",
      email: "elena@buraq.test",
      specialties: "Dressage",
      bio: "Dressage judge and advanced technique specialist.",
    },
  ];
  const instructors = await Promise.all(
    instructorData.map((i) =>
      createUser({
        ...i,
        password: "Instructor@123",
        role: "INSTRUCTOR",
        phone: "+1 (555) 030-2000",
      }),
    ),
  );
  const instructorByName = new Map(instructors.map((i) => [i.name, i]));

  const students = await Promise.all(
    [
      {
        name: "Ayesha Khan",
        email: "ayesha@buraq.test",
        gender: "FEMALE" as const,
      },
      {
        name: "Bilal Ahmed",
        email: "bilal@buraq.test",
        gender: "MALE" as const,
      },
      {
        name: "Carlos Diaz",
        email: "carlos@buraq.test",
        gender: "MALE" as const,
      },
      {
        name: "Dina Farouk",
        email: "dina@buraq.test",
        gender: "FEMALE" as const,
      },
    ].map((s) =>
      createUser({
        ...s,
        password: "Student@123",
        role: "STUDENT",
        phone: "+1 (555) 020-1000",
        address: "123 Stable Lane",
      }),
    ),
  );

  // ── Courses ───────────────────────────────────────────────────────────────
  const courseData = [
    {
      name: "Beginner Horsemanship",
      level: "Beginner",
      durationWeeks: 8,
      maxBookingsPerWeek: 2,
      price: 480,
      instructor: "Sarah Miller",
      schedule: "Mon & Wed 4:00 PM",
      maxStudents: 12,
      description: "Fundamentals of riding, grooming, and horse care.",
    },
    {
      name: "Intermediate Show Jumping",
      level: "Intermediate",
      durationWeeks: 10,
      maxBookingsPerWeek: 1,
      price: 720,
      instructor: "James Cole",
      schedule: "Tue & Thu 5:00 PM",
      maxStudents: 8,
      description: "Course work over fences and rhythm control.",
    },
    {
      name: "Advanced Dressage",
      level: "Advanced",
      durationWeeks: 12,
      maxBookingsPerWeek: 1,
      price: 960,
      instructor: "Elena Petrova",
      schedule: "Sat 9:00 AM",
      maxStudents: 6,
      description: "Precision movements and competitive dressage technique.",
    },
  ];
  const courses = [];
  for (const c of courseData) {
    const instructorUserId = instructorByName.get(c.instructor)?.id ?? null;
    const existing = await prisma.course.findFirst({ where: { name: c.name } });
    if (existing) {
      // Backfill the instructor link on re-seed.
      courses.push(
        await prisma.course.update({
          where: { id: existing.id },
          data: {
            instructorUserId,
            durationWeeks: c.durationWeeks,
            maxBookingsPerWeek: c.maxBookingsPerWeek,
          },
        }),
      );
    } else {
      courses.push(
        await prisma.course.create({ data: { ...c, instructorUserId } }),
      );
    }
  }

  // ── Training slots (recurring weekly) ─────────────────────────────────────
  const slotsByCourse: Record<string, number[]> = {
    "Beginner Horsemanship": [1, 3], // Mon, Wed
    "Intermediate Show Jumping": [2, 4], // Tue, Thu
    "Advanced Dressage": [6], // Sat
  };
  for (const course of courses) {
    const existing = await prisma.courseSlot.count({
      where: { courseId: course.id },
    });
    if (existing > 0) continue;
    const days = slotsByCourse[course.name] ?? [1];
    for (const weekday of days) {
      await prisma.courseSlot.create({
        data: {
          courseId: course.id,
          weekday,
          startTime: "16:00",
          endTime: "19:00", // 3h window
          sessionMinutes: 30, // → 6 single-rider sub-sessions
          capacity: 1,
        },
      });
    }
  }

  // ── Class sessions (next 7 days) ──────────────────────────────────────────
  const existingSessions = await prisma.classSession.count();
  if (existingSessions === 0) {
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const course = courses[i % courses.length];
      await prisma.classSession.create({
        data: {
          courseId: course.id,
          date,
          startTime: "16:00",
          endTime: "17:30",
          instructor: course.instructor,
          instructorUserId: course.instructorUserId,
        },
      });
    }
  }

  // ── Enrollments + attendance ──────────────────────────────────────────────
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const course = courses[i % courses.length];
    await prisma.enrollment.upsert({
      where: {
        studentId_courseId: { studentId: student.id, courseId: course.id },
      },
      update: {},
      create: {
        studentId: student.id,
        courseId: course.id,
        status: "ACTIVE",
        startDate: new Date(),
        approvedAt: new Date(),
        progress: 30 + i * 10,
      },
    });

    // a handful of attendance records over the last 6 days
    for (let d = 1; d <= 6; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      date.setHours(0, 0, 0, 0);
      const status = d % 5 === 0 ? "ABSENT" : d % 3 === 0 ? "LATE" : "PRESENT";
      await prisma.attendance.upsert({
        where: {
          studentId_courseId_date: {
            studentId: student.id,
            courseId: course.id,
            date,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          courseId: course.id,
          date,
          status,
        },
      });
    }
  }

  // ── Sample invoice (unpaid) ───────────────────────────────────────────────
  const invCount = await prisma.invoice.count();
  if (invCount === 0) {
    const due = new Date();
    due.setDate(due.getDate() + 14);
    await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-2026-000001",
        studentId: students[0].id,
        courseId: courses[0].id,
        amount: courses[0].price,
        dueDate: due,
        status: "UNPAID",
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin login:      admin@buraq.test / Admin@12345");
  console.log("Instructor login: sarah@buraq.test / Instructor@123");
  console.log("Student login:    ayesha@buraq.test / Student@123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
