import {
  Document,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { pdfColors } from "./theme";

export type CertificateData = {
  schoolName: string;
  studentName: string;
  courseName: string;
  courseLevel?: string | null;
  certificateId: string;
  issuedDate: string;
  qrDataUrl: string;
  signatureName?: string | null;
  verifyUrl: string;
};

const s = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 12,
    color: pdfColors.text,
    fontFamily: "Helvetica",
  },
  frame: {
    flexGrow: 1,
    borderWidth: 6,
    borderColor: pdfColors.navy,
    padding: 4,
  },
  inner: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: pdfColors.gold,
    paddingVertical: 44,
    paddingHorizontal: 48,
    alignItems: "center",
    justifyContent: "space-between",
  },
  school: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.navy,
    letterSpacing: 1,
  },
  ribbon: {
    marginTop: 6,
    height: 3,
    width: 90,
    backgroundColor: pdfColors.gold,
  },
  title: {
    marginTop: 30,
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.navy,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  subtitle: { marginTop: 8, fontSize: 12, color: pdfColors.muted },
  name: {
    marginTop: 22,
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.gold,
  },
  nameRule: {
    marginTop: 6,
    width: 280,
    height: 1,
    backgroundColor: pdfColors.border,
  },
  course: { marginTop: 18, fontSize: 14, textAlign: "center" },
  courseName: { fontFamily: "Helvetica-Bold", color: pdfColors.navy },
  footer: {
    marginTop: 34,
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sigBlock: { alignItems: "center", width: 180 },
  sigLine: {
    width: 160,
    height: 1,
    backgroundColor: pdfColors.text,
    marginBottom: 4,
  },
  sigLabel: { fontSize: 10, color: pdfColors.muted },
  qrBlock: { alignItems: "center", width: 120 },
  qr: { width: 78, height: 78 },
  meta: {
    fontSize: 8,
    color: pdfColors.muted,
    marginTop: 3,
    textAlign: "center",
  },
  idText: { fontSize: 9, color: pdfColors.navy, fontFamily: "Helvetica-Bold" },
});

function CertificateDoc(data: CertificateData) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.frame}>
          <View style={s.inner}>
            <View style={{ alignItems: "center" }}>
              <Text style={s.school}>{data.schoolName}</Text>
              <View style={s.ribbon} />
              <Text style={s.title}>Certificate</Text>
              <Text style={s.subtitle}>of Completion</Text>
            </View>

            <View style={{ alignItems: "center" }}>
              <Text style={s.subtitle}>This certifies that</Text>
              <Text style={s.name}>{data.studentName}</Text>
              <View style={s.nameRule} />
              <Text style={s.course}>
                has successfully completed the course{"\n"}
                <Text style={s.courseName}>{data.courseName}</Text>
                {data.courseLevel ? ` (${data.courseLevel})` : ""}
              </Text>
            </View>

            <View style={s.footer}>
              <View style={s.sigBlock}>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>
                  {data.signatureName ?? "Authorized Signature"}
                </Text>
                <Text style={s.sigLabel}>Issued {data.issuedDate}</Text>
              </View>
              <View style={s.qrBlock}>
                <Image style={s.qr} src={data.qrDataUrl} />
                <Text style={s.idText}>{data.certificateId}</Text>
                <Text style={s.meta}>Scan to verify authenticity</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function renderCertificatePdf(data: CertificateData): Promise<Buffer> {
  return renderToBuffer(<CertificateDoc {...data} />);
}
