import {
  Document,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { pdfColors } from "./theme";

export type InvoiceData = {
  schoolName: string;
  schoolAddress?: string | null;
  schoolEmail?: string | null;
  schoolPhone?: string | null;
  invoiceNumber: string;
  status: string;
  studentName: string;
  studentEmail: string;
  courseName?: string | null;
  amount: string;
  discount: string;
  total: string;
  dueDate: string;
  issuedDate: string;
  paidDate?: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
};

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: pdfColors.text,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.navy,
  },
  school: { fontSize: 16, fontFamily: "Helvetica-Bold", color: pdfColors.navy },
  schoolMeta: { fontSize: 9, color: pdfColors.muted, marginTop: 2 },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  invNo: { fontSize: 10, marginTop: 2, textAlign: "right" },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  block: { maxWidth: 240 },
  label: {
    fontSize: 8,
    color: pdfColors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  strong: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 28, borderWidth: 1, borderColor: pdfColors.border },
  tHead: {
    flexDirection: "row",
    backgroundColor: pdfColors.navy,
    color: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
  },
  cDesc: { flex: 3 },
  cAmt: { flex: 1, textAlign: "right" },
  totals: { marginTop: 14, alignSelf: "flex-end", width: 220 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 6,
    backgroundColor: pdfColors.bgSoft,
    borderTopWidth: 2,
    borderTopColor: pdfColors.gold,
  },
  grandText: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.navy,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    fontSize: 8,
    color: pdfColors.muted,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
    paddingTop: 8,
  },
  statusPill: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.navy,
    marginTop: 6,
    textAlign: "right",
  },
});

function InvoiceDoc(d: InvoiceData) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.school}>{d.schoolName}</Text>
            {d.schoolAddress ? (
              <Text style={s.schoolMeta}>{d.schoolAddress}</Text>
            ) : null}
            {d.schoolEmail ? (
              <Text style={s.schoolMeta}>{d.schoolEmail}</Text>
            ) : null}
            {d.schoolPhone ? (
              <Text style={s.schoolMeta}>{d.schoolPhone}</Text>
            ) : null}
          </View>
          <View>
            <Text style={s.invoiceTitle}>Invoice</Text>
            <Text style={s.invNo}>{d.invoiceNumber}</Text>
            <Text style={s.statusPill}>{d.status}</Text>
          </View>
        </View>

        <View style={s.billRow}>
          <View style={s.block}>
            <Text style={s.label}>Billed To</Text>
            <Text style={s.strong}>{d.studentName}</Text>
            <Text style={s.schoolMeta}>{d.studentEmail}</Text>
          </View>
          <View>
            <Text style={s.label}>Issued</Text>
            <Text>{d.issuedDate}</Text>
            <Text style={[s.label, { marginTop: 8 }]}>Due</Text>
            <Text>{d.dueDate}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={s.cDesc}>Description</Text>
            <Text style={s.cAmt}>Amount</Text>
          </View>
          <View style={s.tRow}>
            <Text style={s.cDesc}>
              {d.courseName
                ? `Course enrollment — ${d.courseName}`
                : "School fees"}
            </Text>
            <Text style={s.cAmt}>{d.amount}</Text>
          </View>
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>Subtotal</Text>
            <Text>{d.amount}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>Discount</Text>
            <Text>-{d.discount}</Text>
          </View>
        </View>
        <View style={[s.grand, { alignSelf: "flex-end", width: 220 }]}>
          <Text style={s.grandText}>Total</Text>
          <Text style={s.grandText}>{d.total}</Text>
        </View>

        {d.paidDate ? (
          <View style={{ marginTop: 18 }}>
            <Text style={s.label}>Payment</Text>
            <Text>
              Paid on {d.paidDate}
              {d.paymentMethod ? ` via ${d.paymentMethod}` : ""}
              {d.reference ? ` (ref: ${d.reference})` : ""}
            </Text>
          </View>
        ) : null}

        <Text style={s.footer}>
          Thank you for riding with {d.schoolName}. Please settle this invoice
          by the due date.
        </Text>
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDoc {...data} />);
}
