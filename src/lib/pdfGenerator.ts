import { jsPDF } from 'jspdf';
import {
  CertificateRecord,
  Cohort,
  InstituteSettings,
  Invoice,
  Programme,
  ReceiptRecord,
  StudentProfile,
} from '../types';

const LOGO_PATH = '/assets/aistudio/IMG-20261113-WA0005_cbe9bb69.jpg';

function formatCurrency(amount: number, currency = 'NGN'): string {
  const prefix = currency === 'NGN' ? 'NGN ' : `${currency} `;
  return `${prefix}${Number(amount || 0).toLocaleString('en-NG')}`;
}

async function loadLogoDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 300;
        canvas.height = img.naturalHeight || 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = LOGO_PATH;
  });
}

async function drawBrandedHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  settings?: InstituteSettings | null
): Promise<number> {
  const logo = await loadLogoDataUrl();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top orange accent rule
  doc.setFillColor(249, 80, 30);
  doc.rect(0, 0, pageWidth, 4, 'F');

  if (logo) {
    doc.addImage(logo, 'JPEG', 16, 12, 24, 24);
  }

  const textX = logo ? 45 : 16;
  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(settings?.instituteName || 'ARTDROBOTIX INSTITUTE', textX, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(249, 80, 30);
  doc.text(
    settings?.descriptor || 'SCHOOL OF ART, SCIENCE & TECHNOLOGY',
    textX,
    24.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `${settings?.supportEmail || 'admissions@artdrobotix.edu.ng'}  |  ${
      settings?.whatsappNumbers || '0706 812 4439 | 0911 427 6223'
    }`,
    textX,
    30
  );
  doc.text(
    settings?.address || 'Lagos, Nigeria — In-Person & Live Online Campus',
    textX,
    34.5
  );

  // Right-aligned Document Type label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 17, 17);
  doc.text(title, pageWidth - 16, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(subtitle, pageWidth - 16, 26, { align: 'right' });

  doc.setDrawColor(220, 220, 220);
  doc.line(16, 41, pageWidth - 16, 41);

  return 48;
}

function drawFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.setDrawColor(249, 80, 30);
  doc.line(16, pageHeight - 16, pageWidth - 16, pageHeight - 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'ARTDROBOTIX INSTITUTE — SCHOOL OF ART, SCIENCE & TECHNOLOGY | Official Institutional Record',
    16,
    pageHeight - 10
  );
}

export async function downloadProformaInvoicePdf(
  invoice: Invoice,
  settings?: InstituteSettings | null
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currency = settings?.currency || 'NGN';

  let y = await drawBrandedHeader(
    doc,
    invoice.invoiceType === 'WEEKLY_INSTALMENT'
      ? `PROFORMA INVOICE · WEEK ${invoice.instalmentNumber}/${invoice.totalInstalments}`
      : 'PROFORMA INVOICE',
    invoice.invoiceNumber,
    settings
  );

  // Metadata + Student Details two-column block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17);
  doc.text('BILLED TO', 16, y);
  doc.text('INVOICE METADATA', 118, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(invoice.recipientName, 16, y);
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 118, y);
  y += 5;
  doc.text(invoice.recipientEmail, 16, y);
  doc.text(`Issue Date: ${invoice.issueDate}`, 118, y);
  y += 5;
  doc.text(invoice.recipientPhone || '—', 16, y);
  doc.text(`Due Date: ${invoice.dueDate}`, 118, y);
  y += 5;
  doc.text(`Plan: ${invoice.paymentArrangement}`, 16, y);
  doc.text(
    `Grace Deadline: ${invoice.graceDeadline || invoice.dueDate} (${settings?.gracePeriodHours ?? 48}h grace)`,
    118,
    y
  );
  y += 5;
  doc.text(`Format: ${invoice.trainingFormat} · ${invoice.trainingDuration}`, 16, y);
  doc.text(`Status: ${invoice.policyState || invoice.status}`, 118, y);

  y += 10;
  doc.setFillColor(17, 17, 17);
  doc.rect(16, y, pageWidth - 32, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PROGRAMME / DESCRIPTION', 20, y + 5.5);
  doc.text('QTY', 132, y + 5.5, { align: 'right' });
  doc.text('UNIT FEE', 160, y + 5.5, { align: 'right' });
  doc.text('AMOUNT', pageWidth - 20, y + 5.5, { align: 'right' });

  y += 12;
  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const items =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : [
          {
            id: 1,
            invoiceId: invoice.id,
            description: `${invoice.programmeTitle} (${invoice.trainingDuration} · ${invoice.trainingFormat})`,
            quantity: 1,
            unitPrice: invoice.subtotal,
            lineTotal: invoice.subtotal,
          },
        ];

  for (const item of items) {
    const lines = doc.splitTextToSize(item.description, 102);
    doc.text(lines, 20, y);
    doc.text(String(item.quantity), 132, y, { align: 'right' });
    doc.text(formatCurrency(item.unitPrice, currency), 160, y, {
      align: 'right',
    });
    doc.text(formatCurrency(item.lineTotal, currency), pageWidth - 20, y, {
      align: 'right',
    });
    y += Math.max(7, lines.length * 4.5 + 3);
    doc.setDrawColor(235, 235, 235);
    doc.line(16, y - 2, pageWidth - 16, y - 2);
  }

  y += 6;
  const summaryX = 122;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX, y);
  doc.text(formatCurrency(invoice.subtotal, currency), pageWidth - 20, y, {
    align: 'right',
  });
  y += 5.5;
  doc.text('Discount:', summaryX, y);
  doc.text(`- ${formatCurrency(invoice.discount, currency)}`, pageWidth - 20, y, {
    align: 'right',
  });
  y += 5.5;
  doc.text('Additional Charges:', summaryX, y);
  doc.text(
    formatCurrency(invoice.additionalCharges, currency),
    pageWidth - 20,
    y,
    { align: 'right' }
  );
  y += 6.5;

  doc.setFillColor(245, 245, 245);
  doc.rect(summaryX - 4, y - 4.5, pageWidth - 16 - (summaryX - 4), 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL PAYABLE:', summaryX, y + 1.5);
  doc.setTextColor(249, 80, 30);
  doc.text(formatCurrency(invoice.totalPayable, currency), pageWidth - 20, y + 1.5, {
    align: 'right',
  });

  y += 12;
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(9);
  doc.text(`Amount Paid to Date: ${formatCurrency(invoice.amountPaid, currency)}`, summaryX, y);
  y += 5;
  doc.text(`Outstanding Balance: ${formatCurrency(invoice.balanceDue, currency)}`, summaryX, y);

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PAYMENT INSTRUCTIONS & POLICY', 16, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const policyCopy = `${invoice.paymentInstructions} ${
    settings?.paymentPolicySummary ||
    `Reminders are issued ${settings?.reminderHoursBeforeDue ?? 48}h before due dates with a ${
      settings?.gracePeriodHours ?? 48
    }h grace period for communicated delays. Official receipts are issued strictly after verification.`
  }`;
  const instrLines = doc.splitTextToSize(policyCopy, pageWidth - 32);
  doc.text(instrLines, 16, y);
  y += instrLines.length * 4.3 + 4;

  if (settings?.bankName) {
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Bank: ${settings.bankName}  |  Account Name: ${settings.accountName}  |  Account No: ${settings.accountNumber}`,
      16,
      y
    );
    doc.setFont('helvetica', 'normal');
    y += 8;
  }

  y += 8;
  doc.setDrawColor(180, 180, 180);
  doc.line(16, y, 80, y);
  doc.setFontSize(8.5);
  doc.text('Authorised Representative — Artdrobotix Institute', 16, y + 5);

  drawFooter(doc, pageWidth, pageHeight);
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

export async function downloadOfficialReceiptPdf(
  receipt: ReceiptRecord,
  invoice?: Invoice | null,
  settings?: InstituteSettings | null
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currency = settings?.currency || 'NGN';

  let y = await drawBrandedHeader(
    doc,
    'OFFICIAL RECEIPT',
    receipt.receiptNumber,
    settings
  );

  doc.setFillColor(246, 246, 246);
  doc.rect(16, y, pageWidth - 32, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(22, 163, 74);
  doc.text('VERIFIED INSTITUTIONAL PAYMENT RECEIPT', 22, y + 7.5);
  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Issued officially after administrative payment verification on ${receipt.paymentDate}.`,
    22,
    y + 13.5
  );

  y += 28;
  const rows: [string, string][] = [
    ['Receipt Number', receipt.receiptNumber],
    ['Student / Recipient Name', receipt.studentName],
    ['Related Invoice', invoice?.invoiceNumber || `INV #${receipt.invoiceId}`],
    ['Programme', invoice?.programmeTitle || 'Artdrobotix Training Programme'],
    ['Amount Received', formatCurrency(receipt.amountReceived, currency)],
    ['Payment Date', receipt.paymentDate],
    ['Payment Method', receipt.paymentMethod],
    ['Transaction Reference', receipt.transactionReference],
    ['Remaining Balance', formatCurrency(receipt.outstandingBalance, currency)],
  ];

  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(80, 80, 80);
    doc.text(label, 20, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 17, 17);
    doc.text(value, 90, y);

    doc.setDrawColor(235, 235, 235);
    doc.line(16, y + 3, pageWidth - 16, y + 3);
    y += 10;
  }

  y += 16;
  doc.setDrawColor(180, 180, 180);
  doc.line(16, y, 86, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Finance & Admissions Office — Artdrobotix Institute', 16, y + 5);

  drawFooter(doc, pageWidth, pageHeight);
  doc.save(`${receipt.receiptNumber}.pdf`);
}

export async function downloadAdmissionLetterPdf(
  student: StudentProfile,
  programme?: Programme | null,
  cohort?: Cohort | null,
  settings?: InstituteSettings | null
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = await drawBrandedHeader(
    doc,
    'ADMISSION LETTER',
    student.admissionNumber,
    settings
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 17, 17);
  doc.text(`Date: ${new Date().toISOString().slice(0, 10)}`, 16, y);
  y += 6;
  doc.text(`Student Admission Number: ${student.admissionNumber}`, 16, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Dear ${student.fullName},`, 16, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const intro = doc.splitTextToSize(
    `We are pleased to confirm your formal admission and enrolment into Artdrobotix Institute (School of Art, Science & Technology) for the ${
      programme?.title || 'selected technology programme'
    }.`,
    pageWidth - 32
  );
  doc.text(intro, 16, y);
  y += intro.length * 5.2 + 6;

  const details: [string, string][] = [
    ['Programme', programme?.title || 'Artdrobotix Programme'],
    ['Duration', programme?.durationText || '3 Weeks (27 Practical Hours)'],
    ['Delivery Format', cohort?.deliveryFormat || programme?.deliveryFormat || 'Hybrid'],
    ['Assigned Cohort', cohort ? `${cohort.name} (${cohort.code})` : 'Standard Cohort'],
    ['Training Schedule', cohort?.scheduleText || 'Confirmed in Student Portal'],
    ['Commencement Date', student.commencementDate],
    ['Lead Instructor', cohort?.instructorName || settings?.instructorName || 'Prince Anyanwu'],
  ];

  for (const [label, val] of details) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val, 72, y);
    y += 7;
  }

  y += 6;
  const onboardingBody = doc.splitTextToSize(
    'Please sign in to your Artdrobotix Student Portal using your registered email address to view your full curriculum modules, software setup instructions, assignments, and official financial ledger.',
    pageWidth - 32
  );
  doc.text(onboardingBody, 16, y);
  y += onboardingBody.length * 5 + 16;

  doc.setDrawColor(180, 180, 180);
  doc.line(16, y, 86, y);
  doc.setFontSize(9);
  doc.text('Office of Admissions & Academic Affairs', 16, y + 5);
  doc.text('Artdrobotix Institute', 16, y + 10);

  drawFooter(doc, pageWidth, pageHeight);
  doc.save(`${student.admissionNumber}-Admission-Letter.pdf`);
}

export async function downloadCertificatePdf(
  cert: CertificateRecord,
  settings?: InstituteSettings | null
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logo = await loadLogoDataUrl();

  // Outer institutional frame
  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setDrawColor(249, 80, 30);
  doc.setLineWidth(0.6);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  if (logo) {
    doc.addImage(logo, 'JPEG', pageWidth / 2 - 14, 20, 28, 28);
  }

  let y = 55;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 17, 17);
  doc.text('ARTDROBOTIX INSTITUTE', pageWidth / 2, y, { align: 'center' });

  y += 5.5;
  doc.setFontSize(9);
  doc.setTextColor(249, 80, 30);
  doc.text('SCHOOL OF ART, SCIENCE & TECHNOLOGY', pageWidth / 2, y, {
    align: 'center',
  });

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(17, 17, 17);
  doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, y, { align: 'center' });

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text('THIS IS TO CERTIFY THAT', pageWidth / 2, y, { align: 'center' });

  y += 13;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(17, 17, 17);
  doc.text(cert.studentFullName, pageWidth / 2, y, { align: 'center' });

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(
    'has successfully fulfilled all practical, assessment, and academic requirements for the programme',
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(249, 80, 30);
  doc.text(cert.programmeTitle, pageWidth / 2, y, { align: 'center' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(
    `Completed on ${cert.completionDate}   ·   Issued on ${cert.issuedDate}`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  // Signatures & Verification
  const sigY = pageHeight - 36;
  doc.setDrawColor(120, 120, 120);
  doc.line(32, sigY, 96, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 17, 17);
  doc.text(settings?.instructorName || 'Prince Anyanwu', 64, sigY + 5, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Lead Technical Director, Artdrobotix Institute', 64, sigY + 10, {
    align: 'center',
  });

  doc.line(pageWidth - 96, sigY, pageWidth - 32, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Ref: ${cert.certificateNumber}`, pageWidth - 64, sigY + 5, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Verify online: /verify (${cert.verificationCode})`,
    pageWidth - 64,
    sigY + 10,
    { align: 'center' }
  );

  doc.save(`${cert.certificateNumber}.pdf`);
}

export async function downloadAnalyticsReportPdf(
  metrics: Record<string, number>,
  programmeStats: {
    title: string;
    applications: number;
    enrolled: number;
    revenue: number;
  }[],
  settings?: InstituteSettings | null
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currency = settings?.currency || 'NGN';

  let y = await drawBrandedHeader(
    doc,
    'INSTITUTIONAL REPORT',
    `Generated ${new Date().toISOString().slice(0, 10)}`,
    settings
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EXECUTIVE METRICS SUMMARY', 16, y);
  y += 7;

  const summaryRows: [string, string][] = [
    ['Total Applications', String(metrics.totalApplications ?? 0)],
    ['Applications Awaiting Review', String(metrics.pendingApplications ?? 0)],
    ['Accepted Applications', String(metrics.acceptedApplications ?? 0)],
    ['Enrolled Students', String(metrics.enrolledStudents ?? 0)],
    ['Active Students', String(metrics.activeStudents ?? 0)],
    ['Completed Students', String(metrics.completedStudents ?? 0)],
    ['Verified Revenue Generated', formatCurrency(metrics.totalRevenue ?? 0, currency)],
    ['Outstanding Balances', formatCurrency(metrics.outstandingPayments ?? 0, currency)],
    ['Conversion Rate', `${metrics.conversionRate ?? 0}%`],
    ['Completion Rate', `${metrics.completionRate ?? 0}%`],
  ];

  for (const [k, v] of summaryRows) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(k, 20, y);
    doc.setFont('helvetica', 'bold');
    doc.text(v, 115, y);
    y += 6.5;
  }

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PROGRAMME PERFORMANCE BREAKDOWN', 16, y);
  y += 6;

  doc.setFillColor(17, 17, 17);
  doc.rect(16, y, pageWidth - 32, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('PROGRAMME', 19, y + 4.8);
  doc.text('APPS', 120, y + 4.8, { align: 'right' });
  doc.text('ENROLLED', 148, y + 4.8, { align: 'right' });
  doc.text('VERIFIED REVENUE', pageWidth - 19, y + 4.8, { align: 'right' });
  y += 11;

  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'normal');
  for (const row of programmeStats) {
    doc.text(row.title.slice(0, 48), 19, y);
    doc.text(String(row.applications), 120, y, { align: 'right' });
    doc.text(String(row.enrolled), 148, y, { align: 'right' });
    doc.text(formatCurrency(row.revenue, currency), pageWidth - 19, y, {
      align: 'right',
    });
    y += 7;
  }

  drawFooter(doc, pageWidth, pageHeight);
  doc.save(`ARTDROBOTIX-BI-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadCsvReport(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const escape = (val: string | number | null | undefined) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
