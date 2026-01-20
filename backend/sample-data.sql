-- ============================================================
-- MOTION CLONE - SAMPLE DATA FOR SHOWCASE
-- ============================================================
-- 
-- INSTRUCTIONS:
-- 1. First, find your user_id by running:
--    SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL';
--
-- 2. Replace 'YOUR_USER_ID_HERE' below with your actual user_id
--
-- 3. Run this script in Supabase SQL Editor
-- ============================================================

-- Set your user_id here (replace with your actual UUID)
DO $$
DECLARE
    v_user_id UUID := 'f53766ae-5476-45e6-a7d9-91d890903c78';
    
    -- Project IDs
    v_project_webapp UUID;
    v_project_marketing UUID;
    v_project_fitness UUID;
    v_project_learning UUID;
    
    -- Task IDs (for linking calendar events)
    v_task_design UUID;
    v_task_api UUID;
    v_task_testing UUID;
    v_task_content UUID;
    v_task_social UUID;
    v_task_workout UUID;
    v_task_meal UUID;
    v_task_typescript UUID;
    v_task_react UUID;
    
BEGIN
    -- ============================================================
    -- PROJECTS (4 diverse projects)
    -- ============================================================
    
    -- Project 1: Web App Development
    INSERT INTO projects (id, name, description, deadline, status, user_id)
    VALUES (
        uuid_generate_v4(),
        'E-commerce Platform Redesign',
        'Complete redesign of the company e-commerce platform with modern UI/UX, improved performance, and mobile-first approach. Includes new checkout flow and product discovery features.',
        '2026-03-15'::timestamptz,
        'in-progress',
        v_user_id
    ) RETURNING id INTO v_project_webapp;
    
    -- Project 2: Marketing Campaign
    INSERT INTO projects (id, name, description, deadline, status, user_id)
    VALUES (
        uuid_generate_v4(),
        'Q1 2026 Marketing Campaign',
        'Launch comprehensive marketing campaign including social media, email marketing, influencer partnerships, and paid advertising. Target: 50% increase in brand awareness.',
        '2026-03-31'::timestamptz,
        'in-progress',
        v_user_id
    ) RETURNING id INTO v_project_marketing;
    
    -- Project 3: Personal Fitness
    INSERT INTO projects (id, name, description, deadline, status, user_id)
    VALUES (
        uuid_generate_v4(),
        'Fitness & Health Goals 2026',
        'Personal health improvement project: lose 5kg, run a 10K, and establish consistent workout routine. Track nutrition and sleep patterns.',
        '2026-03-31'::timestamptz,
        'not-started',
        v_user_id
    ) RETURNING id INTO v_project_fitness;
    
    -- Project 4: Learning & Development
    INSERT INTO projects (id, name, description, deadline, status, user_id)
    VALUES (
        uuid_generate_v4(),
        'Full-Stack Mastery',
        'Deep dive into advanced TypeScript, React patterns, and backend architecture. Complete 3 certifications and build 2 portfolio projects.',
        '2026-03-20'::timestamptz,
        'in-progress',
        v_user_id
    ) RETURNING id INTO v_project_learning;

    -- ============================================================
    -- MILESTONES
    -- ============================================================
    
    -- Milestones for E-commerce project
    INSERT INTO milestones (title, description, due_date, status, project_id, user_id)
    VALUES 
        ('Design Phase Complete', 'All UI/UX designs approved and ready for development', '2026-02-07'::timestamptz, 'in-progress', v_project_webapp, v_user_id),
        ('MVP Launch', 'Core features deployed to staging environment', '2026-02-28'::timestamptz, 'not-started', v_project_webapp, v_user_id),
        ('Production Release', 'Full launch with all features', '2026-03-15'::timestamptz, 'not-started', v_project_webapp, v_user_id);
    
    -- Milestones for Marketing project
    INSERT INTO milestones (title, description, due_date, status, project_id, user_id)
    VALUES 
        ('Content Calendar Ready', 'All content planned and scheduled for Q1', '2026-02-10'::timestamptz, 'in-progress', v_project_marketing, v_user_id),
        ('Influencer Partnerships', 'Secure 5 key influencer collaborations', '2026-02-28'::timestamptz, 'not-started', v_project_marketing, v_user_id),
        ('Campaign Launch', 'Full campaign goes live', '2026-03-15'::timestamptz, 'not-started', v_project_marketing, v_user_id);

    -- ============================================================
    -- TASKS - FEBRUARY 2026
    -- ============================================================
    
    -- Week 1 February (Feb 2-8)
    INSERT INTO tasks (id, title, description, due_date, priority, status, project_id, user_id)
    VALUES (
        uuid_generate_v4(),
        'Design new product page layouts',
        'Create Figma mockups for product listing and detail pages. Include mobile and desktop versions.',
        '2026-02-03'::timestamptz,
        'high',
        'in-progress',
        v_project_webapp,
        v_user_id
    ) RETURNING id INTO v_task_design;
    
    INSERT INTO tasks (title, description, due_date, priority, status, project_id, user_id)
    VALUES 
        ('Competitor analysis report', 'Analyze top 5 competitors marketing strategies', '2026-02-04'::timestamptz, 'high', 'in-progress', v_project_marketing, v_user_id),
        ('Book gym membership', 'Sign up for local gym with personal trainer sessions', '2026-02-05'::timestamptz, 'high', 'pending', v_project_fitness, v_user_id),
        ('Setup development environment', 'Configure Docker, ESLint, and Prettier for the project', '2026-02-06'::timestamptz, 'medium', 'pending', v_project_webapp, v_user_id);
    
    INSERT INTO tasks (title, description, due_date, priority, status, user_id)
    VALUES 
        ('Renew passport', 'Submit passport renewal application before expiration', '2026-02-07'::timestamptz, 'high', 'pending', v_user_id);
    
    -- Week 2 February (Feb 9-15)
    INSERT INTO tasks (id, title, description, due_date, priority, status, project_id, user_id)
    VALUES (
        uuid_generate_v4(),
        'Build REST API endpoints',
        'Implement CRUD operations for products, cart, and orders. Include authentication middleware.',
        '2026-02-10'::timestamptz,
        'high',
        'pending',
        v_project_webapp,
        v_user_id
    ) RETURNING id INTO v_task_api;
    
    INSERT INTO tasks (id, title, description, due_date, priority, status, project_id, user_id)
    VALUES (
        uuid_generate_v4(),
        'Write blog content series',
        'Create 10 blog posts about industry trends and product features. SEO optimized.',
        '2026-02-11'::timestamptz,
        'high',
        'pending',
        v_project_marketing,
        v_user_id
    ) RETURNING id INTO v_task_content;
    
    INSERT INTO tasks (id, title, description, due_date, priority, status, project_id, user_id)
    VALUES (
        uuid_generate_v4(),
        'Create workout schedule',
        'Plan weekly workout routine: 3x strength training, 2x cardio, 1x flexibility.',
        '2026-02-12'::timestamptz,
        'high',
        'pending',
        v_project_fitness,
        v_user_id
    ) RETURNING id INTO v_task_workout;
    
    INSERT INTO tasks (id, title, description, due_date, priority, status, project_id, user_id)
    VALUES (
        uuid_generate_v4(),
        'Complete TypeScript advanced course',
        'Finish Udemy course on advanced TypeScript patterns and generics.',
        '2026-02-14'::timestamptz,
        'high',
        'in-progress',
        v_project_learning,
        v_user_id
    ) RETURNING id INTO v_task_typescript;
    
    INSERT INTO tasks (title, description, due_date, priority, status, user_id)
    VALUES 
        ('Schedule dentist appointment', 'Book 6-month checkup and cleaning', '2026-02-13'::timestamptz, 'medium', 'pending', v_user_id),
        ('File tax documents', 'Organize and submit annual tax documentation', '2026-02-15'::timestamptz, 'high', 'pending', v_user_id);
    
    -- Week 3 February (Feb 16-22)
    INSERT INTO tasks (id, title, description, due_date, priority, status, project_id, user_id)
    VALUES (
        uuid_generate_v4(),
        'Design social media graphics',
        'Create 30 social media posts for Instagram, LinkedIn, and Twitter.',
        '2026-02-17'::timestamptz,
        'medium',
        'pending',
        v_project_marketing,
        v_user_id
    ) RETURNING id INTO v_task_social;
    
    INSERT INTO tasks (title, description, due_date, priority, status, project_id, user_id)
    VALUES 
        ('Setup CI/CD pipeline', 'Configure GitHub Actions for automated testing and deployment', '2026-02-18'::timestamptz, 'medium', 'pending', v_project_webapp, v_user_id),
        ('Email newsletter setup', 'Design and configure automated email sequences', '2026-02-19'::timestamptz, 'medium', 'pending', v_project_marketing, v_user_id),
        ('Buy fitness tracker', 'Research and purchase smartwatch for workout tracking', '2026-02-20'::timestamptz, 'low', 'pending', v_project_fitness, v_user_id),
        ('Read Clean Architecture book', 'Study and take notes on Uncle Bob''s Clean Architecture', '2026-02-21'::timestamptz, 'medium', 'pending', v_project_learning, v_user_id);
    
    INSERT INTO tasks (title, description, due_date, priority, status, user_id)
    VALUES 
        ('Update LinkedIn profile', 'Refresh work experience and add new skills', '2026-02-16'::timestamptz, 'low', 'pending', v_user_id),
        ('Car service booking', 'Schedule annual car maintenance and inspection', '2026-02-22'::timestamptz, 'medium', 'pending', v_user_id);
    
    -- Week 4 February (Feb 23-28)
    INSERT INTO tasks (id, title, description, due_date, priority, status, project_id, user_id)
    VALUES (
        uuid_generate_v4(),
        'Meal prep planning',
        'Design weekly meal plan with macro tracking. Prep Sundays.',
        '2026-02-23'::timestamptz,
        'medium',
        'pending',
        v_project_fitness,
        v_user_id
    ) RETURNING id INTO v_task_meal;
    
    INSERT INTO tasks (title, description, due_date, priority, status, project_id, user_id)
    VALUES 
        ('Implement payment gateway', 'Integrate Stripe for payment processing with 3D Secure', '2026-02-24'::timestamptz, 'high', 'pending', v_project_webapp, v_user_id),
        ('Launch press release draft', 'Write press release for campaign launch', '2026-02-25'::timestamptz, 'medium', 'pending', v_project_marketing, v_user_id),
        ('Register for 10K race', 'Sign up for spring 10K running event', '2026-02-26'::timestamptz, 'medium', 'pending', v_project_fitness, v_user_id),
        ('Database optimization', 'Add indexes and optimize slow queries', '2026-02-27'::timestamptz, 'medium', 'pending', v_project_webapp, v_user_id);
    
    INSERT INTO tasks (title, description, due_date, priority, status, user_id)
    VALUES 
        ('Birthday gift for Mom', 'Research and buy thoughtful birthday present', '2026-02-28'::timestamptz, 'high', 'pending', v_user_id);
    
    -- ============================================================
    -- TASKS - MARCH 2026
    -- ============================================================
    
    -- Week 1 March (Mar 2-8)
    INSERT INTO tasks (id, title, description, due_date, priority, status, project_id, user_id)
    VALUES (
        uuid_generate_v4(),
        'Write E2E tests',
        'Create Playwright tests for checkout flow, user authentication, and product search.',
        '2026-03-03'::timestamptz,
        'medium',
        'pending',
        v_project_webapp,
        v_user_id
    ) RETURNING id INTO v_task_testing;
    
    INSERT INTO tasks (id, title, description, due_date, priority, status, project_id, user_id)
    VALUES (
        uuid_generate_v4(),
        'Build React portfolio project',
        'Create a full-stack app demonstrating React 19 features and best practices.',
        '2026-03-05'::timestamptz,
        'high',
        'pending',
        v_project_learning,
        v_user_id
    ) RETURNING id INTO v_task_react;
    
    INSERT INTO tasks (title, description, due_date, priority, status, project_id, user_id)
    VALUES 
        ('Influencer outreach campaign', 'Contact and negotiate with 10 potential influencers', '2026-03-02'::timestamptz, 'high', 'pending', v_project_marketing, v_user_id),
        ('Mobile app responsive testing', 'Test all features on iOS and Android devices', '2026-03-04'::timestamptz, 'high', 'pending', v_project_webapp, v_user_id),
        ('Create video tutorials', 'Record 5 product tutorial videos for YouTube', '2026-03-06'::timestamptz, 'medium', 'pending', v_project_marketing, v_user_id),
        ('Half marathon training plan', 'Develop 8-week training schedule for half marathon', '2026-03-07'::timestamptz, 'medium', 'pending', v_project_fitness, v_user_id);
    
    INSERT INTO tasks (title, description, due_date, priority, status, user_id)
    VALUES 
        ('Clean out email inbox', 'Unsubscribe from newsletters and archive old emails', '2026-03-08'::timestamptz, 'low', 'pending', v_user_id);
    
    -- Week 2 March (Mar 9-15)
    INSERT INTO tasks (title, description, due_date, priority, status, project_id, user_id)
    VALUES 
        ('Performance optimization', 'Implement lazy loading, code splitting, and image optimization', '2026-03-09'::timestamptz, 'high', 'pending', v_project_webapp, v_user_id),
        ('SEO audit and fixes', 'Run SEO audit and implement recommended changes', '2026-03-10'::timestamptz, 'medium', 'pending', v_project_marketing, v_user_id),
        ('AWS certification prep', 'Study for AWS Solutions Architect certification', '2026-03-11'::timestamptz, 'medium', 'pending', v_project_learning, v_user_id),
        ('User acceptance testing', 'Coordinate UAT with stakeholders', '2026-03-12'::timestamptz, 'high', 'pending', v_project_webapp, v_user_id),
        ('Yoga and stretching routine', 'Establish daily 15-min yoga practice', '2026-03-13'::timestamptz, 'low', 'pending', v_project_fitness, v_user_id),
        ('Analytics dashboard setup', 'Configure Google Analytics and create custom reports', '2026-03-14'::timestamptz, 'medium', 'pending', v_project_marketing, v_user_id);
    
    INSERT INTO tasks (title, description, due_date, priority, status, user_id)
    VALUES 
        ('Review insurance policies', 'Compare and potentially switch insurance providers', '2026-03-15'::timestamptz, 'medium', 'pending', v_user_id);
    
    -- Week 3 March (Mar 16-22)
    INSERT INTO tasks (title, description, due_date, priority, status, project_id, user_id)
    VALUES 
        ('Security audit', 'Run OWASP security checks and fix vulnerabilities', '2026-03-16'::timestamptz, 'high', 'pending', v_project_webapp, v_user_id),
        ('A/B testing setup', 'Implement A/B tests for landing page variations', '2026-03-17'::timestamptz, 'medium', 'pending', v_project_marketing, v_user_id),
        ('Contribute to open source', 'Make 5 meaningful contributions to OSS projects', '2026-03-18'::timestamptz, 'low', 'pending', v_project_learning, v_user_id),
        ('Customer feedback integration', 'Implement feedback widget and analyze responses', '2026-03-19'::timestamptz, 'medium', 'pending', v_project_webapp, v_user_id),
        ('Nutrition coaching session', 'Book consultation with nutritionist', '2026-03-20'::timestamptz, 'medium', 'pending', v_project_fitness, v_user_id),
        ('Retargeting campaigns', 'Set up Facebook and Google retargeting ads', '2026-03-21'::timestamptz, 'high', 'pending', v_project_marketing, v_user_id);
    
    INSERT INTO tasks (title, description, due_date, priority, status, user_id)
    VALUES 
        ('Home office upgrade', 'Research and buy ergonomic chair and standing desk', '2026-03-22'::timestamptz, 'low', 'pending', v_user_id);
    
    -- Week 4 March (Mar 23-31)
    INSERT INTO tasks (title, description, due_date, priority, status, project_id, user_id)
    VALUES 
        ('Documentation complete', 'Write API documentation and user guides', '2026-03-23'::timestamptz, 'medium', 'pending', v_project_webapp, v_user_id),
        ('Campaign performance report', 'Compile mid-campaign analytics report', '2026-03-24'::timestamptz, 'high', 'pending', v_project_marketing, v_user_id),
        ('System architecture review', 'Document and review overall system architecture', '2026-03-25'::timestamptz, 'medium', 'pending', v_project_learning, v_user_id),
        ('Load testing', 'Run load tests and ensure system handles 10x traffic', '2026-03-26'::timestamptz, 'high', 'pending', v_project_webapp, v_user_id),
        ('5K practice run', 'Complete timed 5K run to track progress', '2026-03-27'::timestamptz, 'medium', 'pending', v_project_fitness, v_user_id),
        ('Email campaign optimization', 'Analyze open rates and optimize subject lines', '2026-03-28'::timestamptz, 'medium', 'pending', v_project_marketing, v_user_id),
        ('Production deployment prep', 'Final checklist before production release', '2026-03-29'::timestamptz, 'high', 'pending', v_project_webapp, v_user_id),
        ('Q1 fitness review', 'Review progress against fitness goals', '2026-03-30'::timestamptz, 'medium', 'pending', v_project_fitness, v_user_id),
        ('Q1 campaign wrap-up', 'Final report and learnings from Q1 campaign', '2026-03-31'::timestamptz, 'high', 'pending', v_project_marketing, v_user_id);
    
    INSERT INTO tasks (title, description, due_date, priority, status, user_id)
    VALUES 
        ('Spring cleaning', 'Deep clean apartment and organize storage', '2026-03-29'::timestamptz, 'low', 'pending', v_user_id),
        ('Plan Q2 goals', 'Define personal and professional Q2 objectives', '2026-03-31'::timestamptz, 'high', 'pending', v_user_id);

    -- ============================================================
    -- CALENDAR EVENTS - FEBRUARY 2026
    -- ============================================================
    
    -- Week 1 February
    INSERT INTO calendar_events (title, start_time, end_time, description, user_id, linked_task_id)
    VALUES 
        ('Design Review Meeting', '2026-02-02 09:00'::timestamptz, '2026-02-02 10:30'::timestamptz, 'Review product page designs with the team', v_user_id, v_task_design),
        ('Team Standup', '2026-02-03 09:00'::timestamptz, '2026-02-03 09:30'::timestamptz, 'Daily sync with development team', v_user_id, NULL),
        ('Deep Work: Design', '2026-02-03 10:00'::timestamptz, '2026-02-03 13:00'::timestamptz, 'Focused design session', v_user_id, v_task_design),
        ('Client Call', '2026-02-04 14:00'::timestamptz, '2026-02-04 15:00'::timestamptz, 'Weekly progress update', v_user_id, NULL),
        ('Gym Orientation', '2026-02-05 18:00'::timestamptz, '2026-02-05 19:30'::timestamptz, 'First gym session with trainer', v_user_id, NULL),
        ('Sprint Planning', '2026-02-06 09:00'::timestamptz, '2026-02-06 11:00'::timestamptz, 'Plan sprint tasks', v_user_id, NULL);
    
    -- Week 2 February
    INSERT INTO calendar_events (title, start_time, end_time, description, user_id, linked_task_id)
    VALUES 
        ('API Development Session', '2026-02-09 10:00'::timestamptz, '2026-02-09 13:00'::timestamptz, 'Build core API endpoints', v_user_id, v_task_api),
        ('Content Writing', '2026-02-10 14:00'::timestamptz, '2026-02-10 17:00'::timestamptz, 'Write blog posts', v_user_id, v_task_content),
        ('TypeScript Course', '2026-02-11 19:00'::timestamptz, '2026-02-11 21:00'::timestamptz, 'Study advanced patterns', v_user_id, v_task_typescript),
        ('Workout: Strength', '2026-02-12 07:00'::timestamptz, '2026-02-12 08:30'::timestamptz, 'Upper body training', v_user_id, v_task_workout),
        ('1:1 with Manager', '2026-02-13 16:00'::timestamptz, '2026-02-13 16:30'::timestamptz, 'Career discussion', v_user_id, NULL),
        ('Tax Prep Session', '2026-02-14 10:00'::timestamptz, '2026-02-14 12:00'::timestamptz, 'Organize documents', v_user_id, NULL);
    
    -- Week 3 February
    INSERT INTO calendar_events (title, start_time, end_time, description, user_id, linked_task_id)
    VALUES 
        ('Social Media Workshop', '2026-02-16 10:00'::timestamptz, '2026-02-16 12:00'::timestamptz, 'Create social graphics', v_user_id, v_task_social),
        ('Code Review Session', '2026-02-17 14:00'::timestamptz, '2026-02-17 16:00'::timestamptz, 'Review team PRs', v_user_id, NULL),
        ('CI/CD Setup', '2026-02-18 10:00'::timestamptz, '2026-02-18 13:00'::timestamptz, 'Configure pipelines', v_user_id, NULL),
        ('Workout: Cardio', '2026-02-19 07:00'::timestamptz, '2026-02-19 08:00'::timestamptz, '5K run', v_user_id, NULL),
        ('Architecture Review', '2026-02-20 14:00'::timestamptz, '2026-02-20 16:00'::timestamptz, 'System design discussion', v_user_id, NULL);
    
    -- Week 4 February
    INSERT INTO calendar_events (title, start_time, end_time, description, user_id, linked_task_id)
    VALUES 
        ('Meal Prep Sunday', '2026-02-22 10:00'::timestamptz, '2026-02-22 13:00'::timestamptz, 'Prepare weekly meals', v_user_id, v_task_meal),
        ('Payment Integration', '2026-02-23 10:00'::timestamptz, '2026-02-23 14:00'::timestamptz, 'Stripe setup', v_user_id, NULL),
        ('Marketing Sync', '2026-02-24 15:00'::timestamptz, '2026-02-24 16:00'::timestamptz, 'Campaign coordination', v_user_id, NULL),
        ('Workout: Strength', '2026-02-25 07:00'::timestamptz, '2026-02-25 08:30'::timestamptz, 'Lower body training', v_user_id, NULL),
        ('Demo to Stakeholders', '2026-02-26 14:00'::timestamptz, '2026-02-26 15:30'::timestamptz, 'Show MVP progress', v_user_id, NULL),
        ('February Retrospective', '2026-02-27 16:00'::timestamptz, '2026-02-27 17:00'::timestamptz, 'Month review', v_user_id, NULL);

    -- ============================================================
    -- CALENDAR EVENTS - MARCH 2026
    -- ============================================================
    
    -- Week 1 March
    INSERT INTO calendar_events (title, start_time, end_time, description, user_id, linked_task_id)
    VALUES 
        ('March Kickoff', '2026-03-02 09:00'::timestamptz, '2026-03-02 10:00'::timestamptz, 'Monthly planning', v_user_id, NULL),
        ('E2E Testing Session', '2026-03-03 10:00'::timestamptz, '2026-03-03 14:00'::timestamptz, 'Write Playwright tests', v_user_id, v_task_testing),
        ('React Project Work', '2026-03-04 14:00'::timestamptz, '2026-03-04 18:00'::timestamptz, 'Portfolio project development', v_user_id, v_task_react),
        ('Influencer Calls', '2026-03-05 10:00'::timestamptz, '2026-03-05 12:00'::timestamptz, 'Partnership discussions', v_user_id, NULL),
        ('Workout: Cardio', '2026-03-06 07:00'::timestamptz, '2026-03-06 08:00'::timestamptz, 'Interval training', v_user_id, NULL),
        ('Team Building Lunch', '2026-03-06 12:00'::timestamptz, '2026-03-06 14:00'::timestamptz, 'Team bonding', v_user_id, NULL);
    
    -- Week 2 March
    INSERT INTO calendar_events (title, start_time, end_time, description, user_id, linked_task_id)
    VALUES 
        ('Performance Optimization', '2026-03-09 10:00'::timestamptz, '2026-03-09 14:00'::timestamptz, 'Frontend optimization', v_user_id, NULL),
        ('SEO Workshop', '2026-03-10 14:00'::timestamptz, '2026-03-10 16:00'::timestamptz, 'SEO best practices', v_user_id, NULL),
        ('AWS Study Session', '2026-03-11 19:00'::timestamptz, '2026-03-11 21:00'::timestamptz, 'Certification prep', v_user_id, NULL),
        ('UAT Session', '2026-03-12 10:00'::timestamptz, '2026-03-12 12:00'::timestamptz, 'User testing', v_user_id, NULL),
        ('Yoga Session', '2026-03-13 07:00'::timestamptz, '2026-03-13 07:45'::timestamptz, 'Morning yoga', v_user_id, NULL),
        ('Product Launch Prep', '2026-03-14 14:00'::timestamptz, '2026-03-14 17:00'::timestamptz, 'Final preparations', v_user_id, NULL);
    
    -- Week 3 March
    INSERT INTO calendar_events (title, start_time, end_time, description, user_id)
    VALUES 
        ('Security Review', '2026-03-16 10:00'::timestamptz, '2026-03-16 13:00'::timestamptz, 'Security audit review', v_user_id),
        ('A/B Test Analysis', '2026-03-17 14:00'::timestamptz, '2026-03-17 15:30'::timestamptz, 'Review test results', v_user_id),
        ('Open Source Day', '2026-03-18 10:00'::timestamptz, '2026-03-18 14:00'::timestamptz, 'OSS contributions', v_user_id),
        ('Feedback Review', '2026-03-19 15:00'::timestamptz, '2026-03-19 16:30'::timestamptz, 'Analyze customer feedback', v_user_id),
        ('Nutrition Consultation', '2026-03-20 11:00'::timestamptz, '2026-03-20 12:00'::timestamptz, 'Meet with nutritionist', v_user_id),
        ('Workout: Strength', '2026-03-21 07:00'::timestamptz, '2026-03-21 08:30'::timestamptz, 'Full body training', v_user_id);
    
    -- Week 4 March
    INSERT INTO calendar_events (title, start_time, end_time, description, user_id)
    VALUES 
        ('Documentation Sprint', '2026-03-23 10:00'::timestamptz, '2026-03-23 15:00'::timestamptz, 'Complete all docs', v_user_id),
        ('Campaign Review', '2026-03-24 14:00'::timestamptz, '2026-03-24 16:00'::timestamptz, 'Mid-campaign analysis', v_user_id),
        ('Architecture Presentation', '2026-03-25 10:00'::timestamptz, '2026-03-25 11:30'::timestamptz, 'Present to team', v_user_id),
        ('Load Testing Session', '2026-03-26 10:00'::timestamptz, '2026-03-26 14:00'::timestamptz, 'Stress test system', v_user_id),
        ('5K Practice Run', '2026-03-27 07:00'::timestamptz, '2026-03-27 08:00'::timestamptz, 'Timed practice run', v_user_id),
        ('Email Optimization', '2026-03-28 14:00'::timestamptz, '2026-03-28 16:00'::timestamptz, 'Analyze and improve', v_user_id),
        ('Production Deployment', '2026-03-29 06:00'::timestamptz, '2026-03-29 10:00'::timestamptz, 'Go live!', v_user_id),
        ('Q1 Fitness Review', '2026-03-30 10:00'::timestamptz, '2026-03-30 11:00'::timestamptz, 'Review fitness progress', v_user_id),
        ('Q1 Wrap-up Meeting', '2026-03-31 14:00'::timestamptz, '2026-03-31 16:00'::timestamptz, 'Quarter review and Q2 planning', v_user_id);

    RAISE NOTICE '✅ Sample data inserted successfully!';
    RAISE NOTICE '📁 Projects created: 4';
    RAISE NOTICE '✅ Tasks created: ~50 (covering Feb & March 2026)';
    RAISE NOTICE '📅 Calendar events created: ~40 (covering Feb & March 2026)';
    RAISE NOTICE '🎯 Milestones created: 6';
    
END $$;

-- ============================================================
-- VERIFICATION QUERIES (run these to check the data)
-- ============================================================
-- SELECT COUNT(*) as projects FROM projects;
-- SELECT COUNT(*) as tasks FROM tasks;
-- SELECT COUNT(*) as calendar_events FROM calendar_events;
-- SELECT COUNT(*) as milestones FROM milestones;
--
-- SELECT title, status, due_date FROM tasks ORDER BY due_date;
-- SELECT title, start_time FROM calendar_events ORDER BY start_time;
