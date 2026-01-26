/**
 * Improved Certificate HTML Template
 * Professional design with better layout and content
 */

// Format date as YYYY-MM-DD (Gregorian)
function formatDateGregorian(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateImprovedCertificateHTML(certificate, qrCodeUrl, qrData) {
  const issueDate = formatDateGregorian(certificate.certificateDetails.issueDate);
  const purchaseDate = formatDateGregorian(certificate.purchaseDetails.purchaseDate);
  
  // Handle purchasePrice - can be object {usd, syp} or number
  const purchasePrice = certificate.purchaseDetails.purchasePrice;
  let priceUsd, priceSyp;
  
  if (typeof purchasePrice === 'object' && purchasePrice !== null) {
    priceUsd = purchasePrice.usd;
    priceSyp = purchasePrice.syp;
  } else {
    priceUsd = purchasePrice;
    priceSyp = null;
  }
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="format-detection" content="telephone=no">
    <title>إيصال ضمان - ${certificate.certificateId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', 'Tahoma', 'Segoe UI', sans-serif;
            background: white;
            color: #333;
            line-height: 1.6;
            padding: 20px;
            direction: rtl;
            text-align: start;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border: 1px solid #ddd;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .receipt-header {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-bottom: 2px solid #333;
        }
        
        .receipt-header h1 {
            font-size: 24px;
            color: #333;
            margin-bottom: 5px;
        }
        
        .receipt-header h2 {
            font-size: 16px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .certificate-id {
            font-size: 14px;
            color: #333;
            font-weight: bold;
        }
        
        .receipt-body {
            padding: 30px;
        }
        
        .receipt-section {
            margin-bottom: 25px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
        }
        
        .receipt-section:last-child {
            border-bottom: none;
        }
        
        .section-title {
            font-size: 18px;
            color: #333;
            margin-bottom: 15px;
            font-weight: bold;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
            text-align: start;
        }
        
        .receipt-row {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 20px;
            margin-bottom: 8px;
            padding: 5px 0;
            align-items: start;
        }
        
        .receipt-label {
            font-weight: bold;
            color: #555;
            text-align: right;
            white-space: nowrap;
        }
        
        .receipt-value {
            color: #333;
            text-align: left;
            word-break: break-word;
            overflow-wrap: break-word;
        }
        
        /* English values should be LTR */
        .receipt-value[dir="ltr"],
        .receipt-value .ltr {
            direction: ltr;
            text-align: left;
        }
        
        .qr-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            border: 1px solid #ddd;
            background: #f9f9f9;
        }
        
        .qr-code {
            max-width: 200px;
            margin: 0 auto 15px;
        }
        
        .qr-code img {
            width: 100%;
            height: auto;
        }
        
        .qr-text {
            font-size: 14px;
            color: #666;
        }
        
        .receipt-footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #ddd;
        }
        
        .receipt-footer p {
            margin: 5px 0;
            font-size: 12px;
            color: #666;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .status-active {
            background: #d4edda;
            color: #155724;
        }
        
        .status-revoked {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status-transferred {
            background: #fff3cd;
            color: #856404;
        }
        
        /* Mobile Responsive Styles */
        @media screen and (max-width: 768px) {
            body {
                padding: 10px;
                font-size: 14px;
            }
            
            .receipt-container {
                max-width: 100%;
                border: none;
                box-shadow: none;
            }
            
            .receipt-header {
                padding: 15px;
            }
            
            .receipt-header h1 {
                font-size: 20px;
            }
            
            .receipt-header h2 {
                font-size: 14px;
            }
            
            .certificate-id {
                font-size: 12px;
            }
            
            .receipt-body {
                padding: 15px;
            }
            
            .section-title {
                font-size: 16px;
                margin-bottom: 12px;
                text-align: start;
            }
            
            .receipt-row {
                flex-direction: column;
                margin-bottom: 12px;
                padding: 8px 0;
                align-items: stretch;
                gap: 6px;
            }
            
            .receipt-label {
                margin-bottom: 0;
                flex: 0 0 auto;
                font-size: 14px;
                text-align: start;
            }
            
            .receipt-value {
                text-align: start;
                font-size: 14px;
                width: 100%;
            }
            
            .qr-section {
                padding: 15px;
                margin: 20px 0;
            }
            
            .qr-code {
                max-width: 150px;
            }
            
            .qr-text {
                font-size: 12px;
            }
            
            .receipt-footer {
                padding: 15px;
            }
            
            .receipt-footer p {
                font-size: 11px;
                text-align: center;
            }
        }
        
        @media screen and (max-width: 480px) {
            body {
                padding: 8px;
                font-size: 13px;
            }
            
            .receipt-header {
                padding: 12px;
            }
            
            .receipt-header h1 {
                font-size: 18px;
            }
            
            .receipt-header h2 {
                font-size: 12px;
            }
            
            .receipt-body {
                padding: 12px;
            }
            
            .section-title {
                font-size: 14px;
                text-align: start;
            }
            
            .receipt-label,
            .receipt-value {
                font-size: 13px;
            }
            
            .qr-code {
                max-width: 120px;
            }
        }
        
        /* iPhone specific fixes */
        @media screen and (max-width: 414px) {
            body {
                padding: 5px;
                -webkit-text-size-adjust: 100%;
            }
            
            .receipt-container {
                width: 100%;
            }
            
            .receipt-body {
                padding: 10px;
            }
            
            .receipt-row {
                margin-bottom: 10px;
            }
        }
        
        @media print {
            body {
                background: white;
                margin: 0;
                padding: 0;
            }
            .receipt-container {
                box-shadow: none;
                border: 1px solid #333;
                margin: 0;
                max-width: none;
                width: 100%;
            }
        }
        
        @page {
            size: A4;
            margin: 15mm;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="receipt-header">
            <h1>إيصال ضمان</h1>
            <h2>Warranty Receipt</h2>
            <div class="certificate-id">رقم الشهادة: ${certificate.certificateId}</div>
        </div>
        
        <div class="receipt-body">
            <div class="receipt-section">
                <div class="section-title">تفاصيل القطعة</div>
                <div class="receipt-row">
                    <span class="receipt-label">الاسم:</span>
                    <span class="receipt-value">${certificate.jewelryDetails.name}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">المادة:</span>
                    <span class="receipt-value">${certificate.jewelryDetails.material}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">العيار:</span>
                    <span class="receipt-value">${certificate.jewelryDetails.karat}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">الوزن:</span>
                    <span class="receipt-value">${certificate.jewelryDetails.weight}</span>
                </div>
            </div>
            
            <div class="receipt-section">
                <div class="section-title">معلومات الشهادة</div>
                <div class="receipt-row">
                    <span class="receipt-label">رقم الشهادة:</span>
                    <span class="receipt-value" dir="ltr">${certificate.certificateId}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">تاريخ الإصدار:</span>
                    <span class="receipt-value">${issueDate}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">الحالة:</span>
                    <span class="receipt-value status-badge status-${certificate.certificateDetails.status}">${getStatusText(certificate.certificateDetails.status)}</span>
                </div>
            </div>
            
            <div class="receipt-section">
                <div class="section-title">تفاصيل الشراء</div>
                <div class="receipt-row">
                    <span class="receipt-label">تاريخ الشراء:</span>
                    <span class="receipt-value">${purchaseDate}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">السعر (USD):</span>
                    <span class="receipt-value" dir="ltr">$${Number(priceUsd).toLocaleString()}</span>
                </div>
                ${priceSyp ? `
                <div class="receipt-row">
                    <span class="receipt-label">السعر (SYP):</span>
                    <span class="receipt-value" dir="ltr">${Number(priceSyp).toLocaleString()} ل.س</span>
                </div>
                ` : ''}
                <div class="receipt-row">
                    <span class="receipt-label">طريقة الدفع:</span>
                    <span class="receipt-value">${certificate.purchaseDetails.paymentMethod}</span>
                </div>
            </div>
            
            <div class="receipt-section">
                <div class="section-title">معلومات إضافية</div>
                <div class="receipt-row">
                    <span class="receipt-label">العميل:</span>
                    <span class="receipt-value">${certificate.customer?.username || certificate.customerInfo?.name || 'غير محدد'}</span>
                </div>
                ${(certificate.customer?.email || certificate.customerInfo?.email) ? `
                <div class="receipt-row">
                    <span class="receipt-label">البريد الإلكتروني:</span>
                    <span class="receipt-value" dir="ltr">${certificate.customer?.email || certificate.customerInfo?.email}</span>
                </div>
                ` : ''}
                ${(certificate.customer?.phone || certificate.customerInfo?.phone) ? `
                <div class="receipt-row">
                    <span class="receipt-label">رقم الهاتف:</span>
                    <span class="receipt-value" dir="ltr">${certificate.customer?.phone || certificate.customerInfo?.phone}</span>
                </div>
                ` : ''}
                <div class="receipt-row">
                    <span class="receipt-label">رمز التحقق:</span>
                    <span class="receipt-value" dir="ltr">${certificate.certificateDetails.verificationCode}</span>
                </div>
            </div>
            
            ${qrCodeUrl ? `
            <div class="qr-section">
                <div class="qr-code">
                    <img src="${qrCodeUrl}" alt="QR Code">
                </div>
                <div class="qr-text">امسح الرمز للتحقق من صحة الشهادة</div>
            </div>
            ` : ''}
            
            ${qrData ? `
            <div class="receipt-section">
                <div class="section-title">معلومات التحقق</div>
                <div class="receipt-row">
                    <span class="receipt-label">رابط التحقق:</span>
                    <span class="receipt-value" style="word-break: break-all; font-size: 12px; font-family: monospace;">${typeof qrData === 'string' ? qrData : (qrData.certificateUrl || JSON.stringify(qrData))}</span>
                </div>
            </div>
            ` : ''}
        </div>
        
        <div class="receipt-footer">
            <p><strong>نظام نزار للتحقق من المجوهرات</strong></p>
            <p>هذا الإيصال صادر إلكترونياً</p>
            <p>© ${new Date().getFullYear()} Nizar Jewelry Authentication System</p>
        </div>
    </div>
</body>
</html>
  `;
}

function getStatusText(status) {
  const statusMap = {
    'active': 'نشطة',
    'revoked': 'ملغية',
    'transferred': 'منقولة'
  };
  return statusMap[status] || status;
}

module.exports = {
  generateImprovedCertificateHTML,
  getStatusText
};
