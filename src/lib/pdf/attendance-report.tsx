import {
  Document,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { pdfColors } from "./theme";

export type AttendanceReportData = {
  schoolName: string;
  studentName: string;
  studentId?: string | null;
  generatedDate: string;
  summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    rate: number;
  };
  rows: { date: string; course: string; status: string }[];
};

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: pdfColors.text,
    fontFamily: "Helvetica",
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.navy,
  },
  school: { fontSize: 15, fontFamily: "Helvetica-Bold", color: pdfColors.navy },
  title: {
    fontSize: 12,
    marginTop: 4,
    color: pdfColors.gold,
    fontFamily: "Helvetica-Bold",
  },
  meta: { fontSize: 9, color: pdfColors.muted, marginTop: 2 },
  cards: { flexDirection: "row", gap: 8, marginTop: 18 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: pdfColors.border,
    borderRadius: 4,
    padding: 8,
  },
  cardVal: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.navy,
  },
  cardLbl: { fontSize: 8, color: pdfColors.muted, textTransform: "uppercase" },
  rate: {
    marginTop: 14,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.navy,
  },
  table: { marginTop: 16, borderWidth: 1, borderColor: pdfColors.border },
  tHead: {
    flexDirection: "row",
    backgroundColor: pdfColors.navy,
    color: "#fff",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
  },
  cDate: { flex: 1 },
  cCourse: { flex: 2 },
  cStatus: { flex: 1, textAlign: "right" },
});

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={s.card}>
      <Text style={s.cardVal}>{value}</Text>
      <Text style={s.cardLbl}>{label}</Text>
    </View>
  );
}

function AttendanceDoc(d: AttendanceReportData) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.school}>{d.schoolName}</Text>
          <Text style={s.title}>Attendance Report</Text>
          <Text style={s.meta}>
            {d.studentName}
            {d.studentId ? ` · ${d.studentId}` : ""} · Generated{" "}
            {d.generatedDate}
          </Text>
        </View>

        <View style={s.cards}>
          <Card label="Present" value={d.summary.present} />
          <Card label="Absent" value={d.summary.absent} />
          <Card label="Late" value={d.summary.late} />
          <Card label="Excused" value={d.summary.excused} />
          <Card label="Total" value={d.summary.total} />
        </View>
        <Text style={s.rate}>Attendance rate: {d.summary.rate}%</Text>

        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={s.cDate}>Date</Text>
            <Text style={s.cCourse}>Course</Text>
            <Text style={s.cStatus}>Status</Text>
          </View>
          {d.rows.map((r, i) => (
            <View style={s.tRow} key={`${r.date}-${i}`}>
              <Text style={s.cDate}>{r.date}</Text>
              <Text style={s.cCourse}>{r.course}</Text>
              <Text style={s.cStatus}>{r.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export function renderAttendanceReportPdf(
  data: AttendanceReportData,
): Promise<Buffer> {
  return renderToBuffer(<AttendanceDoc {...data} />);
}
