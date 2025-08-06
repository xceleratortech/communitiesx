import { randomUUID } from 'crypto';
import { hashPassword } from 'better-auth/crypto';
import { db } from '@/server/db';
import { orgs, users, accounts } from '@/server/db/auth-schema';
import { communities, communityMembers } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';

// Configuration
const ORG_ID = '3C2eDJhYHhIdsv_5PeeRB';
// const ORG_ID ='uPRiR4TKD06IkHejPFx8N'
const DEFAULT_PASSWORD = 'Password@1234';

// User data (all except first 4, which are commented out)
const userData = {
    // "Ranjan S Bhat": "ranjan.sb@atriauniversity.edu.in",
    // "Hanan Majid": "hananmajid738@gmail.com",
    // "Md Kaif Alam": "Kaif2027000@gmail.com",
    // "Kaushik Raju": "Kaushik.raju@atriagroups.com",
    'Tarini Sai Padmanabhuni': 'tarinip26@gmail.com',
    'Achyutha Chandra': 'achyuchandra@gmail.com',
    'Kubendra G T': 'kubendra2003@gmail.com',
    'Lalit S': 'lalit.subramani2003@gmail.com',
    'NIRGUN S N': 'Nirgungowda6@gmail.com',
    'Arya Nanda J A': 'aryanandaja05@gmail.com',
    'C Hari Kiran': 'kiran.ed05@gmail.com',
    'Dhanush Shetty': 'dhanushshetty172@gmail.com',
    'Manish Gowda T': 'tgowda4707@gmail.com',
    'Omkar Upadhyay': 'omkar18u@gmail.com',
    'Mohammed Abdul Jabbar': 'msj_999@outlook.com',
    'Neha Sharma': 'nehasharma147@outlook.com',
    'PVN Vikrant': 'pratapvikrant1510@gmail.com',
    'SUHA ZAHIR': 'suha.zahir2005@gmail.com',
    'SULAIMAN ABDULLA SHARIFF': 'sulaiman05221@gmail.com',
    'Prakruthi K R': 'prakruthikr2004@gmail.com',
    'S SAI SHREYAS': 'shreyassai777@gmail.com',
    'Samiksha Agarwal': 'samiksha.stays@gmail.com',
    'Srujana M': 'm.srujana2004@gmail.com',
    'Alisha L': 'alishalingam01@gmail.com',
    'Prajwal Raju B M': 'prajwalraju05@gmail.com',
    'Harshith P Gowda': 'harshithg1935@gmail.com',
    'MOHAMED FAROOK TK': 'farooqtk.46@gmail.com',
    Ranjit: 'ranjitalagiri@gmail.com',
    'Sujnan ch': 'Sujnanrao13@gmail.com',
    'Nachiket Vijay Hiredesai': 'hiredesaiahimsa3@gmail.com',
    'Rakshith Hipparagi': 'rakshithhipparagi123@gmail.com',
    'Rakshitha K M': 'rvim24mba178.rvim@rvei.edu.in',
    'Prasanna Kumar C S': 'prasannacs999@gmail.com',
    'dharshan D K': 'darshadarsha815@gmail.com',
    'Jayashree Mishra': 'jayashreemishra1405@gmail.com',
    'Leepi Dewanand Khobragade': 'leepidk5@gmail.com',
    'Pranjal Bramhankar': 'pranjalp677@gmail.com',
    'ANIL KARABHARI': 'anilkarabhari050@gmail.com',
    'Bhoomi Sagar': 'bhoomisagar08@gmail.com',
    'R Sanjeeth Balan': 'san23cre@gmail.com',
    'Vignesh Ganaraja Bhat': 'justavizzard@gmail.com',
    'Shobitha L P Gowda': 'shobithalpg@gmail.com',
    'Suchith S': 'suchith1234gowda@icloud.com',
    'Suhas M Gowda': 'suhasmgowdaa@gmail.com',
    'Yashas g s': 'Yashasgs7@gmail.com',
    'Anurag Singh': 'anuragh.s@atriauniversity.edu.in',
    'Meghana S': 'Meghana.s@atriauniversity.edu.in',
    'R Yeshwanth': 'yeshwanth.r@atriauniversity.edu.in',
    'Suraj Patil': 'ap.suraj06@gmail.com',
    'Avinash N': 'Avinashn200618@gmail.com',
    'CHANDANA SHREE N': 'chandanashree.bt23@bmsce.ac.in',
    'S R KRUTHIKA': 'srkruthika.bt23@bmsce.ac.in',
    'Bitan Dutta': 'bitandutta6345@gmail.com',
    'Akshata Siked': 'sikedakshata1408@gmail.com',
    'NIKHEEL BHUMANNA SHIRSHYAD': 'nikheelshirashyad5074@gmail.com',
    'NARAYANA R PUJARI': 'rvim23mba094.rvim@rvei.edu.in',
    'Poornima Ganapati Hegde': 'poornimahegde389@gmail.com',
    'PRAMATH GOPAL HEGDE': 'pramath.connect@gmail.com',
    'Amarjeet Kumar': 'amarjeet.k@atriauniversity.edu.in',
    'Anjali Sharma': 'anjali.s@atriauniversity.edu.in',
    'Gopal Tomar': 'gopaltomar2380@gmail.com',
    'Jimil Doshi': 'jimil.d@atriauniversity.edu.in',
    'Kshitiz Trigunayat': 'kshitiz52.525@gmail.com',
    'P mohammed haseeb': 'haseebmohammed312@gmail.com',
    'Syed Hyder Mahadi': 'syedhydermahadi@gmail.com',
    'A N SUPRIYA': 'ansupriya190304@gmail.com',
    'DHANUSH M': 'mohan.a7610@gmail.com',
    'Jeeva V': 'jeevavpriya1412@gmail.com',
    'SAATVIK.V': 'saatvikv15@gmail.com',
    'Vishesh N': 'visheshvishi001@gmail.com',
    'Monika R. K': 'Monikark83@gmail.com',
    'Neha Sonam': 'sonamneha15@gmail.com',
    'Om Arjun Gadkar': 'omkishan2605@gmail.com',
    'Vishwanth Ramanan': 'vishwanthr.03@gmail.com',
    'Ajay Agarwal': 'aj.agrawal@gmail.com',
    'Murlidhar Surya': 'murlidharsurya@gmail.com',
    'Dr.Purandar Chakravarty': 'pcworks20@gmail.com',
    'Madanmohan Rao': 'madan@yourstory.com',
    'Sumit Marwah': 'sumit.marwah@icloud.com',
    'Himansha Singh': 'himansha.singh@craste.co',
    'Ananthram Varayur': 'Ananth@manasum.com',
    'K Vaitheeswaran': 'vaithee.k@gmail.com',
    'Jagadish Sunkad': 'jagadeeshsunkad@gmail.com',
    'Himanshu Gupta': 'himu79@gmail.com',
    'Chinmaya AM': 'chinmaya@agraga.co.in',
    'Chetan Raja': 'chetan@arnav.in',
    'Nitin Awasthi': 'nitin_awasthi@yahoo.com',
    'Sudhanshu Goyal': 'sudhanshu.g@healthgennie.com',
    'Mohanram P V': 'mohanpv@live.com',
    'Romil Turakia': 'romilturakhia@gmail.com',
    'Sandhya Vasudevan': 'Svasudevan253@gmail.com',
};

// Community data with user assignments (all, but first 4 users in Aasta commented out)
const communityData = {
    Aasta: [
        // { name: "Ranjan S Bhat", email: "ranjan.sb@atriauniversity.edu.in" },
        // { name: "Hanan Majid", email: "hananmajid738@gmail.com" },
        // { name: "Md Kaif Alam", email: "Kaif2027000@gmail.com" },
        // { name: "Kaushik Raju", email: "Kaushik.raju@atriagroups.com" },
        // The rest will be added as they are onboarded
    ],
    'AXORY AI': [
        { name: 'Tarini Sai Padmanabhuni', email: 'tarinip26@gmail.com' },
        { name: 'Ajay Agarwal', email: 'aj.agrawal@gmail.com' },
    ],
    BarkBites: [
        { name: 'Achyutha Chandra', email: 'achyuchandra@gmail.com' },
        { name: 'Kubendra G T', email: 'kubendra2003@gmail.com' },
        { name: 'Lalit S', email: 'lalit.subramani2003@gmail.com' },
        { name: 'NIRGUN S N', email: 'Nirgungowda6@gmail.com' },
    ],
    'BUDDY BOT': [
        { name: 'Arya Nanda J A', email: 'aryanandaja05@gmail.com' },
        { name: 'C Hari Kiran', email: 'kiran.ed05@gmail.com' },
        { name: 'Dhanush Shetty', email: 'dhanushshetty172@gmail.com' },
        { name: 'Manish Gowda T', email: 'tgowda4707@gmail.com' },
        { name: 'Omkar Upadhyay', email: 'omkar18u@gmail.com' },
        { name: 'Murlidhar Surya', email: 'murlidharsurya@gmail.com' },
    ],
    ScrapSaver: [
        { name: 'Mohammed Abdul Jabbar', email: 'msj_999@outlook.com' },
        { name: 'Neha Sharma', email: 'nehasharma147@outlook.com' },
        { name: 'PVN Vikrant', email: 'pratapvikrant1510@gmail.com' },
        { name: 'SUHA ZAHIR', email: 'suha.zahir2005@gmail.com' },
        { name: 'SULAIMAN ABDULLA SHARIFF', email: 'sulaiman05221@gmail.com' },
        { name: 'Dr.Purandar Chakravarty', email: 'pcworks20@gmail.com' },
    ],
    FairGig: [
        { name: 'Prakruthi K R', email: 'prakruthikr2004@gmail.com' },
        { name: 'S SAI SHREYAS', email: 'shreyassai777@gmail.com' },
        { name: 'Samiksha Agarwal', email: 'samiksha.stays@gmail.com' },
        { name: 'Srujana M', email: 'm.srujana2004@gmail.com' },
        { name: 'Madanmohan Rao', email: 'madan@yourstory.com' },
    ],
    'Foxnut Fusion': [
        { name: 'Alisha L', email: 'alishalingam01@gmail.com' },
        { name: 'Prajwal Raju B M', email: 'prajwalraju05@gmail.com' },
        { name: 'Sumit Marwah', email: 'sumit.marwah@icloud.com' },
    ],
    'Green Wing Rubbers': [
        { name: 'Harshith P Gowda', email: 'harshithg1935@gmail.com' },
        { name: 'MOHAMED FAROOK TK', email: 'farooqtk.46@gmail.com' },
        { name: 'Ranjit', email: 'ranjitalagiri@gmail.com' },
        { name: 'Sujnan ch', email: 'Sujnanrao13@gmail.com' },
        { name: 'Himansha Singh', email: 'himansha.singh@craste.co' },
    ],
    'Happy Age': [
        {
            name: 'Nachiket Vijay Hiredesai',
            email: 'hiredesaiahimsa3@gmail.com',
        },
        { name: 'Rakshith Hipparagi', email: 'rakshithhipparagi123@gmail.com' },
        { name: 'Rakshitha K M', email: 'rvim24mba178.rvim@rvei.edu.in' },
        { name: 'Prasanna Kumar C S', email: 'prasannacs999@gmail.com' },
        { name: 'dharshan D K', email: 'darshadarsha815@gmail.com' },
        { name: 'Ananthram Varayur', email: 'Ananth@manasum.com' },
    ],
    'K V Foods': [
        { name: 'Jayashree Mishra', email: 'jayashreemishra1405@gmail.com' },
        { name: 'Leepi Dewanand Khobragade', email: 'leepidk5@gmail.com' },
        { name: 'Pranjal Bramhankar', email: 'pranjalp677@gmail.com' },
        { name: 'K Vaitheeswaran', email: 'vaithee.k@gmail.com' },
    ],
    'Krishi Bhoomi AI': [
        { name: 'ANIL KARABHARI', email: 'anilkarabhari050@gmail.com' },
        { name: 'Bhoomi Sagar', email: 'bhoomisagar08@gmail.com' },
        { name: 'R Sanjeeth Balan', email: 'san23cre@gmail.com' },
        { name: 'Vignesh Ganaraja Bhat', email: 'justavizzard@gmail.com' },
        { name: 'Jagadish Sunkad', email: 'jagadeeshsunkad@gmail.com' },
    ],
    'LOOP KICKS': [
        { name: 'Shobitha L P Gowda', email: 'shobithalpg@gmail.com' },
        { name: 'Suchith S', email: 'suchith1234gowda@icloud.com' },
        { name: 'Suhas M Gowda', email: 'suhasmgowdaa@gmail.com' },
        { name: 'Yashas g s', email: 'Yashasgs7@gmail.com' },
        { name: 'Himanshu Gupta', email: 'himu79@gmail.com' },
    ],
    'MY SUBTRACK': [
        { name: 'Anurag Singh', email: 'anuragh.s@atriauniversity.edu.in' },
        { name: 'Meghana S', email: 'Meghana.s@atriauniversity.edu.in' },
        { name: 'R Yeshwanth', email: 'yeshwanth.r@atriauniversity.edu.in' },
        { name: 'Suraj Patil', email: 'ap.suraj06@gmail.com' },
        { name: 'Chinmaya AM', email: 'chinmaya@agraga.co.in' },
    ],
    Narrow: [
        { name: 'Avinash N', email: 'Avinashn200618@gmail.com' },
        { name: 'CHANDANA SHREE N', email: 'chandanashree.bt23@bmsce.ac.in' },
        { name: 'S R KRUTHIKA', email: 'srkruthika.bt23@bmsce.ac.in' },
        { name: 'Chetan Raja', email: 'chetan@arnav.in' },
    ],
    'Numble.ai': [
        { name: 'Bitan Dutta', email: 'bitandutta6345@gmail.com' },
        { name: 'Nitin Awasthi', email: 'nitin_awasthi@yahoo.com' },
    ],
    OZY: [
        { name: 'Akshata Siked', email: 'sikedakshata1408@gmail.com' },
        {
            name: 'NIKHEEL BHUMANNA SHIRSHYAD',
            email: 'nikheelshirashyad5074@gmail.com',
        },
        { name: 'NARAYANA R PUJARI', email: 'rvim23mba094.rvim@rvei.edu.in' },
        {
            name: 'Poornima Ganapati Hegde',
            email: 'poornimahegde389@gmail.com',
        },
        { name: 'PRAMATH GOPAL HEGDE', email: 'pramath.connect@gmail.com' },
        { name: 'Sudhanshu Goyal', email: 'sudhanshu.g@healthgennie.com' },
    ],
    Planiva: [
        { name: 'Amarjeet Kumar', email: 'amarjeet.k@atriauniversity.edu.in' },
        { name: 'Anjali Sharma', email: 'anjali.s@atriauniversity.edu.in' },
        { name: 'Gopal Tomar', email: 'gopaltomar2380@gmail.com' },
        { name: 'Jimil Doshi', email: 'jimil.d@atriauniversity.edu.in' },
        { name: 'Kshitiz Trigunayat', email: 'kshitiz52.525@gmail.com' },
        { name: 'Mohanram P V', email: 'mohanpv@live.com' },
    ],
    ReSilix: [
        { name: 'P mohammed haseeb', email: 'haseebmohammed312@gmail.com' },
        { name: 'Syed Hyder Mahadi', email: 'syedhydermahadi@gmail.com' },
        { name: 'Romil Turakia', email: 'romilturakhia@gmail.com' },
    ],
    SHEILD: [
        { name: 'A N SUPRIYA', email: 'ansupriya190304@gmail.com' },
        { name: 'DHANUSH M', email: 'mohan.a7610@gmail.com' },
        { name: 'Jeeva V', email: 'jeevavpriya1412@gmail.com' },
        { name: 'SAATVIK.V', email: 'saatvikv15@gmail.com' },
        { name: 'Vishesh N', email: 'visheshvishi001@gmail.com' },
        { name: 'Nitin Awasthi', email: 'nitin_awasthi@yahoo.com' },
    ],
    UpStart: [
        { name: 'Monika R. K', email: 'Monikark83@gmail.com' },
        { name: 'Neha Sonam', email: 'sonamneha15@gmail.com' },
        { name: 'Om Arjun Gadkar', email: 'omkishan2605@gmail.com' },
        { name: 'Vishwanth Ramanan', email: 'vishwanthr.03@gmail.com' },
        { name: 'Sandhya Vasudevan', email: 'Svasudevan253@gmail.com' },
    ],
};

// Function to create slug from name
function createSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');
}

// Email template for user welcome and credentials
function createWelcomeEmail(name: string, email: string, password: string) {
    const platformUrl = 'https://communityx.xcelerator.in';

    return {
        subject: 'Welcome to TiE Communities Platform - Your Login Credentials',
        html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TiE Communities</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                margin: 0; 
                padding: 0; 
                background-color: #f4f4f4; 
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #ffffff; 
                box-shadow: 0 0 10px rgba(0,0,0,0.1); 
            }
            .header { 
                text-align: center; 
                padding: 30px 20px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
            }
            .logo { 
                max-width: 200px; 
                height: auto; 
                margin-bottom: 20px; 
                display: block;
                margin-left: auto;
                margin-right: auto;
            }
            .content { 
                padding: 30px 20px; 
            }
            .welcome-text {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 20px;
                text-align: center;
            }
            .credentials { 
                background: #f8f9fa; 
                padding: 25px; 
                border-radius: 8px; 
                margin: 25px 0; 
                border-left: 4px solid #667eea;
            }
            .credential-item {
                margin: 10px 0;
                padding: 8px 0;
            }
            .credential-label {
                font-weight: bold;
                color: #495057;
                display: inline-block;
                width: 80px;
            }
            .credential-value {
                color: #6c757d;
                font-family: 'Courier New', monospace;
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 3px;
            }
            .login-button { 
                display: inline-block; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 25px; 
                margin: 20px 0; 
                font-weight: bold;
                text-align: center;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                transition: all 0.3s ease;
            }
            .login-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }
            .security-note {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
            .footer { 
                text-align: center; 
                margin-top: 30px; 
                color: #6c757d; 
                font-size: 14px; 
                padding: 20px;
                border-top: 1px solid #e9ecef;
            }
            .features {
                background: #e8f4fd;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .features h3 {
                color: #2c3e50;
                margin-top: 0;
            }
            .features ul {
                margin: 10px 0;
                padding-left: 20px;
            }
            .features li {
                margin: 5px 0;
                color: #495057;
            }
            .logo-text {
                font-size: 28px;
                font-weight: bold;
                color: #ffffff;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <!-- Real TiE logo image -->
                <img src="https://bucket.xcelerator.co.in/TiE_LOGO.jpeg" 
                     alt="TiE Logo" 
                     class="logo" 
                     style="max-width: 200px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; border: 0; outline: none; text-decoration: none;"
                     width="200"
                     height="auto">
                <h1 style="margin: 0; font-size: 24px; color: #ffffff;">Welcome to TiE Communities!</h1>
            </div>
            
            <div class="content">
                <div class="welcome-text">Welcome aboard, ${name}! 🎉</div>
                
                <p>You have been successfully onboarded to the TiE Communities platform. This is your gateway to connect, collaborate, and grow with fellow entrepreneurs and innovators.</p>
                
                <div class="credentials">
                    <h3>🔐 Your Login Credentials:</h3>
                    <div class="credential-item">
                        <span class="credential-label">Email:</span>
                        <span class="credential-value">${email}</span>
                    </div>
                    <div class="credential-item">
                        <span class="credential-label">Password:</span>
                        <span class="credential-value">${password}</span>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="${platformUrl}" class="login-button" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; text-align: center; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">🚀 Access Your Platform</a>
                </div>
                
                <div class="features">
                    <h3>🌟 What you can do on our platform:</h3>
                    <ul>
                        <li>Join private communities and collaborate with peers</li>
                        <li>Share insights, experiences, and knowledge</li>
                        <li>Connect with mentors and industry experts</li>
                        <li>Participate in discussions and forums</li>
                        <li>Access exclusive content and resources</li>
                    </ul>
                </div>
                
                <p>We're excited to have you as part of our growing community of entrepreneurs and innovators!</p>
                
                <p>Best regards,<br>
                <strong>The TiE Communities Team</strong></p>
            </div>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>If you have any questions, please contact our support team.</p>
            </div>
        </div>
    </body>
    </html>
    `,
    };
}

// Function to create user
async function createUser(name: string, email: string): Promise<string> {
    console.log(`👤 Creating user: ${name} (${email})`);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (existingUser) {
        console.log(`   ⚠️  User already exists: ${email}`);
        return existingUser.id;
    }

    // Hash password
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

    // Create user
    const userId = `user-${randomUUID()}`;
    const now = new Date();

    await db.insert(users).values({
        id: userId,
        name,
        email,
        emailVerified: true,
        orgId: ORG_ID,
        role: 'user',
        appRole: 'user',
        createdAt: now,
        updatedAt: now,
    });

    // Create account
    const accountId = `account-${randomUUID()}`;
    await db.insert(accounts).values({
        id: accountId,
        accountId: userId,
        providerId: 'credential',
        userId,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
    });

    console.log(`   ✅ Created user: ${userId}`);

    // Send welcome email
    try {
        console.log(`   📧 Sending welcome email to: ${email}`);
        const emailTemplate = createWelcomeEmail(name, email, DEFAULT_PASSWORD);
        const emailResult = await sendEmail({
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
        });

        if (emailResult.success) {
            console.log(`   ✅ Email sent successfully to: ${email}`);
        } else {
            console.log(
                `   ⚠️  Failed to send email to: ${email} - ${emailResult.error}`,
            );
        }
    } catch (error) {
        console.log(`   ⚠️  Error sending email to ${email}:`, error);
    }

    return userId;
}

// Function to create community
async function createCommunity(
    name: string,
    createdBy: string,
): Promise<number> {
    console.log(`🏘️  Creating community: ${name}`);

    const slug = createSlug(name);

    // Check if community already exists
    const existingCommunity = await db.query.communities.findFirst({
        where: eq(communities.slug, slug),
    });

    if (existingCommunity) {
        console.log(`   ⚠️  Community already exists: ${name}`);
        return existingCommunity.id;
    }

    // Create community
    const [community] = await db
        .insert(communities)
        .values({
            name,
            slug,
            description: `Private community for ${name}`,
            type: 'private',
            postCreationMinRole: 'member',
            orgId: ORG_ID,
            createdBy,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning();

    console.log(`   ✅ Created community: ${community.id}`);
    return community.id;
}

// Function to add user to community
async function addUserToCommunity(
    userId: string,
    communityId: number,
    role: 'admin' | 'member' = 'member',
) {
    console.log(
        `   👥 Adding user ${userId} to community ${communityId} as ${role}`,
    );

    // Check if user is already a member
    const existingMember = await db.query.communityMembers.findFirst({
        where: eq(communityMembers.userId, userId),
    });

    if (existingMember) {
        console.log(`   ⚠️  User already a member of community`);
        return;
    }

    await db.insert(communityMembers).values({
        userId,
        communityId,
        role,
        membershipType: 'member',
        status: 'active',
        joinedAt: new Date(),
        updatedAt: new Date(),
    });

    console.log(`   ✅ Added user to community`);
}

// Main function
async function createUsersAndCommunities() {
    console.log('🚀 Starting user and community creation process...');
    console.log(`📋 Organization ID: ${ORG_ID}`);
    console.log(`🔐 Default password: ${DEFAULT_PASSWORD}`);

    try {
        // Verify organization exists
        const org = await db.query.orgs.findFirst({
            where: eq(orgs.id, ORG_ID),
        });

        if (!org) {
            console.error(`❌ Organization with ID ${ORG_ID} not found!`);
            return;
        }

        console.log(`✅ Found organization: ${org.name}`);

        // Create a map to store user IDs by email
        const userMap = new Map<string, string>();

        // Step 1: Create all users
        console.log('\n📝 Step 1: Creating users...');
        for (const [name, email] of Object.entries(userData)) {
            const userId = await createUser(name, email);
            userMap.set(email, userId);
        }

        // Step 2: Create communities and add users
        console.log('\n🏘️  Step 2: Creating communities and adding users...');

        // Get the first user as the creator (for simplicity)
        const firstUserEmail = Object.values(userData)[0];
        const creatorId = userMap.get(firstUserEmail);

        if (!creatorId) {
            console.error('❌ No users created, cannot create communities');
            return;
        }

        for (const [communityName, members] of Object.entries(communityData)) {
            console.log(`\n🏘️  Processing community: ${communityName}`);

            // Create community
            const communityId = await createCommunity(communityName, creatorId);

            // Add members to community
            for (const member of members) {
                const userId = userMap.get(member.email);
                if (userId) {
                    await addUserToCommunity(userId, communityId, 'member');
                } else {
                    console.log(`   ⚠️  User not found: ${member.email}`);
                }
            }
        }

        console.log('\n✅ Process completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`   - Users created: ${userMap.size}`);
        console.log(
            `   - Communities created: ${Object.keys(communityData).length}`,
        );
        console.log(`   - Default password for all users: ${DEFAULT_PASSWORD}`);
        console.log(`   - Welcome emails sent to all new users`);
        console.log(`   - Platform URL:'https://communityx.xcelerator.in'`);
    } catch (error) {
        console.error('❌ Error during process:', error);
    } finally {
        process.exit(0);
    }
}

// Run the script
createUsersAndCommunities();
