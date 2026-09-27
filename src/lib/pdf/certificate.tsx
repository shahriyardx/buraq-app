import {
  Document,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

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
  /** Image sources (data URLs), PNG or JPEG. */
  logoSrc?: string | null;
  signatureSrc?: string | null;
  designSrc?: string | null;
};

// Brand palette, taken from the school logo (olive shield + brass trim).
const c = {
  olive: "#5c6a3b",
  oliveDark: "#3f4a26",
  brass: "#b08a3e",
  brassSoft: "#d9c28f",
  ink: "#23261d",
  muted: "#6d6f63",
  paper: "#fcfaf4",
};

const s = StyleSheet.create({
  page: {
    backgroundColor: c.paper,
    color: c.ink,
    fontFamily: "Times-Roman",
    padding: 18,
  },
  design: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    objectFit: "cover",
  },
  outer: {
    flexGrow: 1,
    borderWidth: 3,
    borderColor: c.olive,
    padding: 5,
  },
  inner: {
    flexGrow: 1,
    borderWidth: 0.75,
    borderColor: c.brass,
    paddingTop: 26,
    paddingBottom: 18,
    paddingHorizontal: 56,
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 9,
    height: 9,
    backgroundColor: c.brass,
    transform: "rotate(45deg)",
  },
  watermark: {
    position: "absolute",
    top: 118,
    left: "50%",
    marginLeft: -150,
    width: 300,
    height: 300,
    opacity: 0.06,
    objectFit: "contain",
  },
  logo: { width: 62, height: 62, objectFit: "contain" },
  school: {
    marginTop: 8,
    fontFamily: "Times-Bold",
    fontSize: 15,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: c.oliveDark,
  },
  ornament: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  ornamentLine: { width: 70, height: 0.75, backgroundColor: c.brass },
  ornamentDot: {
    width: 5,
    height: 5,
    marginHorizontal: 6,
    backgroundColor: c.brass,
    transform: "rotate(45deg)",
  },
  title: {
    marginTop: 14,
    fontFamily: "Times-Bold",
    fontSize: 34,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: c.olive,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    letterSpacing: 6,
    textTransform: "uppercase",
    color: c.brass,
  },
  presented: {
    marginTop: 20,
    fontFamily: "Times-Italic",
    fontSize: 13,
    color: c.muted,
  },
  name: {
    marginTop: 8,
    fontFamily: "Times-BoldItalic",
    fontSize: 34,
    color: c.ink,
  },
  nameRule: {
    marginTop: 4,
    width: 360,
    height: 0.75,
    backgroundColor: c.brass,
  },
  body: {
    marginTop: 12,
    width: 520,
    fontSize: 12.5,
    lineHeight: 1.5,
    textAlign: "center",
    color: c.ink,
  },
  bodyStrong: { fontFamily: "Times-Bold", color: c.oliveDark },
  footer: {
    marginTop: "auto",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  col: { width: 190, alignItems: "center" },
  sigImage: { width: 140, height: 38, objectFit: "contain" },
  sigSpacer: { height: 38 },
  line: { width: 170, height: 0.75, backgroundColor: c.ink, marginTop: 2 },
  colValue: {
    marginTop: 5,
    fontFamily: "Times-Bold",
    fontSize: 11,
    color: c.ink,
  },
  colLabel: {
    marginTop: 1,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: c.muted,
  },
  qr: { width: 64, height: 64 },
  idText: {
    marginTop: 4,
    fontFamily: "Courier-Bold",
    fontSize: 9,
    color: c.oliveDark,
  },
  strip: {
    marginTop: 12,
    paddingTop: 6,
    width: "100%",
    borderTopWidth: 0.5,
    borderTopColor: c.brassSoft,
    fontSize: 8,
    textAlign: "center",
    color: c.muted,
  },
});

/** "https://app.example.com/verify/X" → "app.example.com/verify/X" */
function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, "");
}

function Corners() {
  const at = [
    { top: -5, left: -5 },
    { top: -5, right: -5 },
    { bottom: -5, left: -5 },
    { bottom: -5, right: -5 },
  ];
  return (
    <>
      {at.map((pos) => (
        <View key={JSON.stringify(pos)} style={[s.corner, pos]} />
      ))}
    </>
  );
}

function CertificateDoc(data: CertificateData) {
  const course = data.courseLevel
    ? `${data.courseName} (${data.courseLevel})`
    : data.courseName;

  return (
    <Document
      title={`Certificate ${data.certificateId}`}
      author={data.schoolName}
      subject={`Certificate of Completion — ${data.studentName}`}
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        {data.designSrc && <Image style={s.design} src={data.designSrc} />}

        <View style={s.outer}>
          <View style={s.inner}>
            <Corners />
            {data.logoSrc && <Image style={s.watermark} src={data.logoSrc} />}

            {data.logoSrc && <Image style={s.logo} src={data.logoSrc} />}
            <Text style={s.school}>{data.schoolName}</Text>
            <View style={s.ornament}>
              <View style={s.ornamentLine} />
              <View style={s.ornamentDot} />
              <View style={s.ornamentLine} />
            </View>

            <Text style={s.title}>Certificate</Text>
            <Text style={s.subtitle}>of Completion</Text>

            <Text style={s.presented}>This is to certify that</Text>
            <Text style={s.name}>{data.studentName}</Text>
            <View style={s.nameRule} />

            <Text style={s.body}>
              has successfully completed the{" "}
              <Text style={s.bodyStrong}>{course}</Text> programme at{" "}
              {data.schoolName}, having fulfilled all required training and
              assessment.
            </Text>

            <View style={s.footer}>
              <View style={s.col}>
                {data.signatureSrc ? (
                  <Image style={s.sigImage} src={data.signatureSrc} />
                ) : (
                  <View style={s.sigSpacer} />
                )}
                <View style={s.line} />
                <Text style={s.colValue}>
                  {data.signatureName ?? "Authorized Signatory"}
                </Text>
                <Text style={s.colLabel}>{data.schoolName}</Text>
              </View>

              <View style={s.col}>
                <View style={s.sigSpacer} />
                <View style={s.line} />
                <Text style={s.colValue}>{data.issuedDate}</Text>
                <Text style={s.colLabel}>Date of Issue</Text>
              </View>

              <View style={s.col}>
                <Image style={s.qr} src={data.qrDataUrl} />
                <Text style={s.idText}>{data.certificateId}</Text>
                <Text style={s.colLabel}>Scan to verify</Text>
              </View>
            </View>

            <Text style={s.strip}>
              Certificate ID {data.certificateId} · Verify the authenticity of
              this certificate at {displayUrl(data.verifyUrl)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function renderCertificatePdf(data: CertificateData): Promise<Buffer> {
  return renderToBuffer(<CertificateDoc {...data} />);
}
