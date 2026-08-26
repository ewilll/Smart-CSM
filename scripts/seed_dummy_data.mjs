import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://szmwawvfejodcjylxtmc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();

const generateData = async () => {
  console.log("Starting dummy data generation...");

  // Create 20 Dummy Profiles
  console.log("Creating 20 Dummy Profiles via Auth Admin...");
  const profiles = [];
  const runId = Math.floor(Math.random() * 10000);
  
  for (let i = 1; i <= 20; i++) {
    const email = `resident${runId}_${i}@test.com`;
    const full_name = `Test Resident ${i}`;
    
    // Create the user in auth.users first to satisfy foreign key constraints
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name, role: 'customer' }
    });

    if (authError) {
      console.error(`Error creating auth user ${email}:`, authError.message);
      continue;
    }

    const id = authData.user.id;

    // Upsert into public.profiles (in case a trigger didn't automatically do it)
    const { error: profileError } = await supabase.from('profiles').upsert({
      id,
      full_name,
      email,
      role: 'customer'
    });

    if (profileError) {
      console.error(`Error upserting profile for ${email}:`, profileError.message);
    } else {
      profiles.push({ id, full_name, email, role: 'customer' });
    }
  }

  if (profiles.length === 0) {
    console.error("No profiles were created successfully. Aborting.");
    return;
  }
  console.log(`${profiles.length} Profiles created successfully.`);

  // Generate 60 Incidents
  console.log("Creating 60 Mock Incidents...");
  const incidentTypes = ['Leak', 'No Water', 'Water Quality', 'Low Pressure', 'Billing Issue', 'Meter Issue', 'Other'];
  const statuses = ['Pending', 'In Progress', 'Dispatched', 'On-Site', 'Resolved'];
  const urgencies = ['Low', 'Medium', 'High', 'Critical'];
  const locations = ['Casisang', 'Malaybalay City', 'Sumpong', 'Kalasungay', 'Aglayan', 'Linabo'];

  const incidents = [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (let i = 1; i <= 60; i++) {
    const profile = randomElement(profiles);
    const date = randomDate(thirtyDaysAgo, new Date());
    incidents.push({
      user_id: profile.id,
      user_name: profile.full_name,
      contact_number: '09' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'),
      description: `This is a randomly generated dummy incident description for testing purposes. Ticket #${i}`,
      type: randomElement(incidentTypes),
      status: randomElement(statuses),
      location: randomElement(locations),
      severity: randomElement(urgencies),
      priority_score: randomInt(1, 10),
      latitude: 8.1 + Math.random() * 0.1,
      longitude: 125.1 + Math.random() * 0.1,
      created_at: date,
      updated_at: date
    });
  }

  const { error: incError } = await supabase.from('incidents').insert(incidents);
  if (incError) console.error("Error inserting incidents:", incError);
  else console.log("60 incidents inserted successfully.");

  // Generate 50 Bills
  console.log("Creating 50 Mock Bills...");
  const bills = [];
  const billStatuses = ['Paid', 'Unpaid', 'Overdue'];
  
  for (let i = 1; i <= 50; i++) {
    const profile = randomElement(profiles);
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - randomInt(1, 60));
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + 15);

    bills.push({
      user_id: profile.id,
      account_no: '000' + randomInt(1, 999),
      address: randomElement(locations),
      amount: parseFloat((Math.random() * 1000 + 200).toFixed(2)),
      status: randomElement(billStatuses),
      due_date: dueDate.toISOString(),
      reading_date: baseDate.toISOString(),
      consumption: randomInt(10, 50),
      created_at: baseDate.toISOString()
    });
  }

  const { error: billError } = await supabase.from('bills').insert(bills);
  if (billError) console.error("Error inserting bills:", billError);
  else console.log("50 bills inserted successfully.");

  console.log("Dummy data seeding completed!");
};

generateData().catch(console.error);
