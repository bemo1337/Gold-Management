const crypto = require('crypto');

const isDevelopment = process.env.NODE_ENV !== 'production';

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/verify-email/${token}`;
  
  // Use EMAIL_REPLY_TO if set, otherwise use EMAIL_FROM (same email is fine for transactional emails)
  const replyTo = process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || 'noreply@gold-jewelry.com';
  
  // Plain text version (important for deliverability)
  const textContent = `
مرحباً ${user.username}!

شكراً لتسجيلك في متجر المجوهرات. لإكمال عملية التسجيل، يرجى تأكيد بريدك الإلكتروني.

انقر على الرابط التالي لتفعيل حسابك:
${verificationUrl}

أو انسخ والصق هذا الرابط في متصفحك:
${verificationUrl}

مهم:
- هذا الرابط صالح لمدة 24 ساعة فقط
- إذا لم تجد الرسالة في صندوق الوارد، يرجى التحقق من مجلد الرسائل غير المرغوب فيها (Spam) ووضعها في البريد الوارد

إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذا البريد الإلكتروني.

© ${new Date().getFullYear()} متجر المجوهرات الذهبية (Nizar Jewellery). جميع الحقوق محفوظة.
  `.trim();
  
  const msg = {
    to: user.email,
    from: {
      email: process.env.EMAIL_FROM || 'noreply@gold-jewelry.com',
      name: 'متجر المجوهرات الذهبية'
    },
    replyTo: replyTo, // Where replies should go (business email, not customer email)
    subject: 'تأكيد البريد الإلكتروني - متجر المجوهرات',
    text: textContent, // Plain text version for better deliverability
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
            direction: rtl;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #D4AF37 0%, #F4E4C1 100%);
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #333;
            margin-top: 0;
          }
          .content p {
            color: #666;
            line-height: 1.6;
            font-size: 16px;
          }
          .button {
            display: inline-block;
            background: #D4AF37;
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .button:hover {
            background: #C19F2F;
          }
          .footer {
            background: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 14px;
          }
          .link {
            color: #D4AF37;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>متجر المجوهرات الذهبية</h1>
          </div>
          <div class="content">
            <h2>مرحباً ${user.username}!</h2>
            <p>شكراً لتسجيلك في متجر المجوهرات. لإكمال عملية التسجيل، يرجى تأكيد بريدك الإلكتروني.</p>
            
            <p>انقر على الزر أدناه لتفعيل حسابك:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">تأكيد البريد الإلكتروني</a>
            </div>
            
            <p>أو انسخ والصق هذا الرابط في متصفحك:</p>
            <p class="link">${verificationUrl}</p>
            
            <p><strong>هذا الرابط صالح لمدة 24 ساعة فقط.</strong></p>
            
            <p style="margin-top: 12px; font-size: 14px; color: #555;">
              إذا لم تجد الرسالة في صندوق الوارد، يرجى التحقق من مجلد الرسائل غير المرغوب فيها (Spam) ووضعها في البريد الوارد.
            </p>
            
            <p>إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذا البريد الإلكتروني.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} متجر المجوهرات الذهبية (Nizar Jewellery). جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  // Email service disabled - return success in dev mode
  return { success: true, devMode: true, verificationUrl, token };
};

// Send password reset email
const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/reset-password/${token}`;
  
  // Use EMAIL_REPLY_TO if set, otherwise use EMAIL_FROM (same email is fine for transactional emails)
  const replyTo = process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || 'noreply@gold-jewelry.com';
  
  // Plain text version (important for deliverability)
  const textContent = `
مرحباً ${user.username}!

لقد طلبت إعادة تعيين كلمة المرور لحسابك.

انقر على الرابط التالي لإعادة تعيين كلمة المرور:
${resetUrl}

أو انسخ والصق هذا الرابط في متصفحك:
${resetUrl}

مهم:
- هذا الرابط صالح لمدة 24 ساعة فقط
- يمكن استخدام هذا الرابط مرة واحدة فقط
- إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني
- إذا لم تجد الرسالة في صندوق الوارد، يرجى التحقق من مجلد الرسائل غير المرغوب فيها (Spam) ووضعها في البريد الوارد

© ${new Date().getFullYear()} متجر المجوهرات الذهبية (Nizar Jewellery). جميع الحقوق محفوظة.
  `.trim();
  
  const msg = {
    to: user.email,
    from: {
      email: process.env.EMAIL_FROM || 'noreply@gold-jewelry.com',
      name: 'متجر المجوهرات الذهبية'
    },
    replyTo: replyTo, // Where replies should go (business email, not customer email)
    subject: 'إعادة تعيين كلمة المرور - متجر المجوهرات',
    text: textContent, // Plain text version for better deliverability
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
            direction: rtl;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #D4AF37 0%, #F4E4C1 100%);
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #333;
            margin-top: 0;
          }
          .content p {
            color: #666;
            line-height: 1.6;
            font-size: 16px;
          }
          .button {
            display: inline-block;
            background: #D4AF37;
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .button:hover {
            background: #C19F2F;
          }
          .footer {
            background: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 14px;
          }
          .link {
            color: #D4AF37;
            word-break: break-all;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>متجر المجوهرات الذهبية</h1>
          </div>
          <div class="content">
            <h2>مرحباً ${user.username}!</h2>
            <p>لقد طلبت إعادة تعيين كلمة المرور لحسابك.</p>
            
            <p>انقر على الزر أدناه لإعادة تعيين كلمة المرور:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">إعادة تعيين كلمة المرور</a>
            </div>
            
            <p>أو انسخ والصق هذا الرابط في متصفحك:</p>
            <p class="link">${resetUrl}</p>
            
            <div class="warning">
              <p><strong>مهم:</strong></p>
              <ul style="margin: 10px 0; padding-right: 20px;">
                <li>هذا الرابط صالح لمدة 24 ساعة فقط</li>
                <li>يمكن استخدام هذا الرابط مرة واحدة فقط</li>
                <li>إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} متجر المجوهرات الذهبية. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  // Email service disabled - return success in dev mode
  return { success: true, devMode: true, resetUrl, token };
};

// Send account lockout email
const sendAccountLockoutEmail = async (user, lockedUntil) => {
  const unlockTime = new Date(lockedUntil).toLocaleString('ar-SA', { 
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const replyTo = process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || 'noreply@gold-jewelry.com';
  
  // Plain text version (important for deliverability)
  const textContent = `
مرحباً ${user.username}!

تم قفل حسابك لأسباب أمنية بسبب عدة محاولات تسجيل دخول فاشلة.

تنبيه أمني:
تم اكتشاف عدة محاولات تسجيل دخول غير صحيحة لحسابك. لحماية حسابك، تم قفله مؤقتاً.

وقت فك القفل:
${unlockTime}

سيتم فك قفل حسابك تلقائياً في الوقت المحدد أعلاه.

نصائح أمنية:
- تأكد من استخدام كلمة مرور قوية وفريدة
- لا تشارك بيانات تسجيل الدخول مع أي شخص
- إذا لم تقم بمحاولات تسجيل الدخول هذه، قم بتغيير كلمة المرور فوراً
- تأكد من أن جهازك خالٍ من البرمجيات الخبيثة

إذا كنت تعتقد أن هذا خطأ أو إذا كنت تحتاج إلى مساعدة، يرجى الاتصال بدعم العملاء.

نعتذر عن أي إزعاج قد يكون هذا سببه.

© ${new Date().getFullYear()} متجر المجوهرات الذهبية. جميع الحقوق محفوظة.
  `.trim();
  
  const msg = {
    to: user.email,
    from: {
      email: process.env.EMAIL_FROM || 'noreply@gold-jewelry.com',
      name: 'متجر المجوهرات الذهبية'
    },
    replyTo: replyTo,
    subject: 'تم قفل حسابك - متجر المجوهرات',
    text: textContent, // Plain text version for better deliverability
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
            direction: rtl;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #333;
            margin-top: 0;
          }
          .content p {
            color: #666;
            line-height: 1.6;
            font-size: 16px;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info {
            background: #d1ecf1;
            border-left: 4px solid #17a2b8;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            background: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 14px;
          }
          .unlock-time {
            font-size: 18px;
            font-weight: bold;
            color: #dc3545;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>متجر المجوهرات الذهبية</h1>
          </div>
          <div class="content">
            <h2>مرحباً ${user.username}!</h2>
            <p>تم قفل حسابك لأسباب أمنية بسبب عدة محاولات تسجيل دخول فاشلة.</p>
            
            <div class="warning">
              <p><strong>تنبيه أمني:</strong></p>
              <p>تم اكتشاف عدة محاولات تسجيل دخول غير صحيحة لحسابك. لحماية حسابك، تم قفله مؤقتاً.</p>
            </div>
            
            <div class="info">
              <p><strong>وقت فك القفل:</strong></p>
              <p class="unlock-time">${unlockTime}</p>
              <p>سيتم فك قفل حسابك تلقائياً في الوقت المحدد أعلاه.</p>
            </div>
            
            <p><strong>نصائح أمنية:</strong></p>
            <ul style="margin: 10px 0; padding-right: 20px; color: #666;">
              <li>تأكد من استخدام كلمة مرور قوية وفريدة</li>
              <li>لا تشارك بيانات تسجيل الدخول مع أي شخص</li>
              <li>إذا لم تقم بمحاولات تسجيل الدخول هذه، قم بتغيير كلمة المرور فوراً</li>
              <li>تأكد من أن جهازك خالٍ من البرمجيات الخبيثة</li>
            </ul>
            
            <p>إذا كنت تعتقد أن هذا خطأ أو إذا كنت تحتاج إلى مساعدة، يرجى الاتصال بدعم العملاء.</p>
            
            <p>نعتذر عن أي إزعاج قد يكون هذا سببه.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} متجر المجوهرات الذهبية. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  // Email service disabled - return success in dev mode
  return { success: true, devMode: true };
};

module.exports = {
  generateVerificationToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountLockoutEmail
};

