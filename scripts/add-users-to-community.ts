import { randomUUID } from 'crypto';
import { db } from '@/server/db';
import { users, communityMembers, communities } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';

// Configuration
const COMMUNITY_ID = 28;

// User data from your previous script
// const userData = {
//   "Hanan Majid": "hananmajid738@gmail.com",
//   "Md Kaif Alam": "Kaif2027000@gmail.com",
//   "Tarini Sai Padmanabhuni": "tarinip26@gmail.com",
//   "Achyutha Chandra": "achyuchandra@gmail.com",
//   "Kubendra G T": "kubendra2003@gmail.com",
//   "Lalit S": "lalit.subramani2003@gmail.com",
//   "NIRGUN S N": "Nirgungowda6@gmail.com",
//   "Arya Nanda J A": "aryanandaja05@gmail.com",
//   "C Hari Kiran": "kiran.ed05@gmail.com",
//   "Dhanush Shetty": "dhanushshetty172@gmail.com",
//   "Manish Gowda T": "tgowda4707@gmail.com",
//   "Omkar Upadhyay": "omkar18u@gmail.com",
//   "Mohammed Abdul Jabbar": "msj_999@outlook.com",
//   "Neha Sharma": "nehasharma147@outlook.com",
//   "PVN Vikrant": "pratapvikrant1510@gmail.com",
//   "SUHA ZAHIR": "suha.zahir2005@gmail.com",
//   "SULAIMAN ABDULLA SHARIFF": "sulaiman05221@gmail.com",
//   "Prakruthi K R": "prakruthikr2004@gmail.com",
//   "S SAI SHREYAS": "shreyassai777@gmail.com",
//   "Samiksha Agarwal": "samiksha.stays@gmail.com",
//   "Srujana M": "m.srujana2004@gmail.com",
//   "Alisha L": "alishalingam01@gmail.com",
//   "Prajwal Raju B M": "prajwalraju05@gmail.com",
//   "Harshith P Gowda": "harshithg1935@gmail.com",
//   "MOHAMED FAROOK TK": "farooqtk.46@gmail.com",
//   "Ranjit": "ranjitalagiri@gmail.com",
//   "Sujnan ch": "Sujnanrao13@gmail.com",
//   "Nachiket Vijay Hiredesai": "hiredesaiahimsa3@gmail.com",
//   "Rakshith Hipparagi": "rakshithhipparagi123@gmail.com",
//   "Rakshitha K M": "rvim24mba178.rvim@rvei.edu.in",
//   "Prasanna Kumar C S": "prasannacs999@gmail.com",
//   "dharshan D K": "darshadarsha815@gmail.com",
//   "Jayashree Mishra": "jayashreemishra1405@gmail.com",
//   "Leepi Dewanand Khobragade": "leepidk5@gmail.com",
//   "Pranjal Bramhankar": "pranjalp677@gmail.com",
//   "ANIL KARABHARI": "anilkarabhari050@gmail.com",
//   "Bhoomi Sagar": "bhoomisagar08@gmail.com",
//   "R Sanjeeth Balan": "san23cre@gmail.com",
//   "Vignesh Ganaraja Bhat": "justavizzard@gmail.com",
//   "Shobitha L P Gowda": "shobithalpg@gmail.com",
//   "Suchith S": "suchith1234gowda@icloud.com",
//   "Suhas M Gowda": "suhasmgowdaa@gmail.com",
//   "Yashas g s": "Yashasgs7@gmail.com",
//   "Anurag Singh": "anuragh.s@atriauniversity.edu.in",
//   "Meghana S": "Meghana.s@atriauniversity.edu.in",
//   "R Yeshwanth": "yeshwanth.r@atriauniversity.edu.in",
//   "Suraj Patil": "ap.suraj06@gmail.com",
//   "Avinash N": "Avinashn200618@gmail.com",
//   "CHANDANA SHREE N": "chandanashree.bt23@bmsce.ac.in",
//   "S R KRUTHIKA": "srkruthika.bt23@bmsce.ac.in",
//   "Bitan Dutta": "bitandutta6345@gmail.com",
//   "Akshata Siked": "sikedakshata1408@gmail.com",
//   "NIKHEEL BHUMANNA SHIRSHYAD": "nikheelshirashyad5074@gmail.com",
//   "NARAYANA R PUJARI": "rvim23mba094.rvim@rvei.edu.in",
//   "Poornima Ganapati Hegde": "poornimahegde389@gmail.com",
//   "PRAMATH GOPAL HEGDE": "pramath.connect@gmail.com",
//   "Amarjeet Kumar": "amarjeet.k@atriauniversity.edu.in",
//   "Anjali Sharma": "anjali.s@atriauniversity.edu.in",
//   "Gopal Tomar": "gopaltomar2380@gmail.com",
//   "Jimil Doshi": "jimil.d@atriauniversity.edu.in",
//   "Kshitiz Trigunayat": "kshitiz52.525@gmail.com",
//   "P mohammed haseeb": "haseebmohammed312@gmail.com",
//   "Syed Hyder Mahadi": "syedhydermahadi@gmail.com",
//   "A N SUPRIYA": "ansupriya190304@gmail.com",
//   "DHANUSH M": "mohan.a7610@gmail.com",
//   "Jeeva V": "jeevavpriya1412@gmail.com",
//   "SAATVIK.V": "saatvikv15@gmail.com",
//   "Vishesh N": "visheshvishi001@gmail.com",
//   "Monika R. K": "Monikark83@gmail.com",
//   "Neha Sonam": "sonamneha15@gmail.com",
//   "Om Arjun Gadkar": "omkishan2605@gmail.com",
//   "Vishwanth Ramanan": "vishwanthr.03@gmail.com",
//   "Kaushik Raju": "Kaushik.raju@atriagroups.com",
//   "Ajay Agarwal": "aj.agrawal@gmail.com",
//   "Murlidhar Surya": "murlidharsurya@gmail.com",
//   "Dr.Purandar Chakravarty": "pcworks20@gmail.com",
//   "Madanmohan Rao": "madan@yourstory.com",
//   "Sumit Marwah": "sumit.marwah@icloud.com",
//   "Himansha Singh": "himansha.singh@craste.co",
//   "Ananthram Varayur": "Ananth@manasum.com",
//   "K Vaitheeswaran": "vaithee.k@gmail.com",
//   "Jagadish Sunkad": "jagadeeshsunkad@gmail.com",
//   "Himanshu Gupta": "himu79@gmail.com",
//   "Chinmaya AM": "chinmaya@agraga.co.in",
//   "Chetan Raja": "chetan@arnav.in",
//   "Nitin Awasthi": "nitin_awasthi@yahoo.com",
//   "Sudhanshu Goyal": "sudhanshu.g@healthgennie.com",
//   "Mohanram P V": "mohanpv@live.com",
//   "Romil Turakia": "romilturakhia@gmail.com",
//   "Sandhya Vasudevan": "Svasudevan253@gmail.com",
//   "Ranjan-Atria": "ranjan.sb@atriauniversity.edu.in"
// };

const userData = {
    'Ajay S Kabadi': 'ajay.kabadi94@gmail.com',
};
// const userData = {
//     'Kaushik Raju': 'kaushik.raju@atriagroups.com',
//     'Ajay Agarwal': 'aj.agrawal@gmail.com',
//     'Murlidhar Surya': 'murlidharsurya@gmail.com',
//     'Dr.Purandar Chakravarty': 'pcworks20@gmail.com',
//     'Madanmohan Rao': 'madan@yourstory.com',
//     'Sumit Marwah': 'sumit.marwah@icloud.com',
//     'Himansha Singh': 'himansha.singh@craste.co',
//     'Ananthram Varayur': 'ananth@manasum.com',
//     'K Vaitheeswaran': 'vaithee.k@gmail.com',
//     'Jagadish Sunkad': 'jagadeeshsunkad@gmail.com',
//     'Himanshu Gupta': 'himu79@gmail.com',
//     'Chinmaya AM': 'chinmaya@agraga.co.in',
//     'Chetan Raja': 'chetan@arnav.in',
//     'Nitin Awasthi': 'nitin_awasthi@yahoo.com',
//     'Sudhanshu Goyal': 'sudhanshu.g@healthgennie.com',
//     'Mohanram P V': 'mohanpv@live.com',
//     'Romil Turakia': 'romilturakhia@gmail.com',
//     'Sandhya Vasudevan': 'svasudevan253@gmail.com',
// };
// Function to find user by email (force lowercase)
async function findUserByEmail(email: string): Promise<string | null> {
    const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
    });
    return user ? user.id : null;
}

// Function to check if user is already a member of the community
async function isUserAlreadyMember(
    userId: string,
    communityId: number,
): Promise<boolean> {
    const existingMember = await db.query.communityMembers.findFirst({
        where: and(
            eq(communityMembers.userId, userId),
            eq(communityMembers.communityId, communityId),
        ),
    });

    return !!existingMember;
}

// Function to add user to community
async function addUserToCommunity(
    userId: string,
    communityId: number,
    userEmail: string,
) {
    console.log(`   👥 Adding user ${userEmail} to community ${communityId}`);

    // Check if user is already a member
    const alreadyMember = await isUserAlreadyMember(userId, communityId);

    if (alreadyMember) {
        console.log(
            `   ⚠️  User ${userEmail} is already a member of community ${communityId}`,
        );
        return;
    }

    await db.insert(communityMembers).values({
        userId,
        communityId,
        role: 'member',
        membershipType: 'member',
        status: 'active',
        joinedAt: new Date(),
        updatedAt: new Date(),
    });

    console.log(`   ✅ Added user ${userEmail} to community ${communityId}`);
}

// Main function
async function addUsersToExistingCommunity() {
    console.log(
        '🚀 Starting bulk user addition to community (uppercase emails only)...',
    );
    console.log(`🎯 Target Community ID: ${COMMUNITY_ID}`);

    // Use all users in userData (no filter for uppercase emails)
    const filteredUserData = Object.entries(userData);
    console.log(`👥 Users to add: ${filteredUserData.length}`);
    console.log('');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    try {
        // Verify community exists
        const community = await db.query.communities.findFirst({
            where: eq(communities.id, COMMUNITY_ID),
        });
        if (!community) {
            console.error(`❌ Community with ID ${COMMUNITY_ID} not found!`);
            return;
        }
        console.log(
            `✅ Found target community: ${community.name || 'Unknown'}`,
        );
        console.log('');

        // Process each user (only those with uppercase in email)
        for (const [name, email] of filteredUserData) {
            const lowerEmail = email.toLowerCase();
            console.log(`🔍 Processing: ${name} (${email}) as (${lowerEmail})`);
            try {
                // Find user by lowercased email
                const userId = await findUserByEmail(lowerEmail);
                if (!userId) {
                    console.log(`   ⚠️  User not found: ${lowerEmail}`);
                    errorCount++;
                    continue;
                }
                // Check if already a member
                const alreadyMember = await isUserAlreadyMember(
                    userId,
                    COMMUNITY_ID,
                );
                if (alreadyMember) {
                    console.log(`   ⚠️  Already a member: ${lowerEmail}`);
                    skipCount++;
                    continue;
                }
                // Add user to community
                await addUserToCommunity(userId, COMMUNITY_ID, lowerEmail);
                successCount++;
            } catch (error) {
                console.log(`   ❌ Error processing ${lowerEmail}:`, error);
                errorCount++;
            }
            console.log('');
        }

        // Summary
        console.log('📊 SUMMARY:');
        console.log(`✅ Successfully added: ${successCount} users`);
        console.log(`⚠️  Already members: ${skipCount} users`);
        console.log(`❌ Errors/Not found: ${errorCount} users`);
        console.log(
            `📝 Total processed: ${successCount + skipCount + errorCount} users`,
        );
        console.log(`🎯 Target Community ID: ${COMMUNITY_ID}`);
        if (successCount > 0) {
            console.log('\n🎉 Bulk user addition completed successfully!');
        }
    } catch (error) {
        console.error('❌ Error during bulk user addition:', error);
    } finally {
        process.exit(0);
    }
}

// Run the script
addUsersToExistingCommunity();
