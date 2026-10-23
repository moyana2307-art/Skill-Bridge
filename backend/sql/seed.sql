-- ============================================================
-- SkillBridge AI - Seed data
-- Adds the skills catalogue and clearly labelled demo jobs.
-- Safe to run more than once: skills use INSERT IGNORE and the
-- demo opportunities check for an existing title/organisation.
-- Run as root AFTER schema.sql:
--   mysql -u root < backend/sql/seed.sql
-- ============================================================

USE skillbridge_ai;

INSERT IGNORE INTO skills (name, category) VALUES
  ('HTML', 'Programming'),
  ('CSS', 'Programming'),
  ('JavaScript', 'Programming'),
  ('React', 'Programming'),
  ('Node.js', 'Programming'),
  ('Python', 'Programming'),
  ('Git', 'Programming'),
  ('SQL', 'Data'),
  ('Data Visualization', 'Data'),
  ('Statistics', 'Data'),
  ('Excel', 'Data'),
  ('UI Design', 'Design'),
  ('UX Research', 'Design'),
  ('Figma', 'Design'),
  ('Graphic Design', 'Design'),
  ('Social Media Marketing', 'Marketing'),
  ('Content Writing', 'Marketing'),
  ('SEO', 'Marketing'),
  ('Email Marketing', 'Marketing'),
  ('Technical Support', 'IT Support'),
  ('Networking Basics', 'IT Support'),
  ('Troubleshooting', 'IT Support'),
  ('Cloud Computing', 'IT Support'),
  ('Communication', 'Professional'),
  ('Teamwork', 'Professional'),
  ('Problem Solving', 'Professional'),
  ('Time Management', 'Professional'),
  ('English Proficiency', 'Professional');

-- Demo jobs. These are sample records for testing the directory, matching,
-- saving, and external application links. They are marked is_demo = 1 and
-- use LinkedIn job-search links for the matching role and location.
INSERT INTO opportunities
  (title, organisation, description, opportunity_type, required_skills,
   location, is_remote, eligibility, application_deadline, application_url,
   source_name, is_demo, is_active)
SELECT
  'Junior Frontend Developer',
  'Demo Tech Zimbabwe',
  'Demo listing: build responsive web interfaces with HTML, CSS, JavaScript, and React. Work with designers and senior developers to turn mockups into accessible pages.',
  'job',
  'HTML, CSS, JavaScript, React, Git',
  'Harare',
  0,
  'Recent graduates or self-taught developers with a small portfolio of web projects.',
  DATE_ADD(CURDATE(), INTERVAL 30 DAY),
  'https://www.linkedin.com/jobs/search/?keywords=Junior%20Frontend%20Developer&location=Zimbabwe',
  'LinkedIn job search (demo)',
  1,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM opportunities
  WHERE title = 'Junior Frontend Developer'
    AND organisation = 'Demo Tech Zimbabwe'
    AND is_demo = 1
);

INSERT INTO opportunities
  (title, organisation, description, opportunity_type, required_skills,
   location, is_remote, eligibility, application_deadline, application_url,
   source_name, is_demo, is_active)
SELECT
  'Data Analyst',
  'Demo Analytics Hub',
  'Demo listing: clean and analyse operational data, build dashboards, and explain trends to non-technical colleagues. Training and mentoring are provided.',
  'job',
  'SQL, Excel, Data Visualization, Statistics',
  'Harare',
  1,
  'A quantitative qualification or equivalent practical experience with spreadsheets and SQL.',
  DATE_ADD(CURDATE(), INTERVAL 24 DAY),
  'https://www.linkedin.com/jobs/search/?keywords=Data%20Analyst&location=Zimbabwe',
  'LinkedIn job search (demo)',
  1,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM opportunities
  WHERE title = 'Data Analyst'
    AND organisation = 'Demo Analytics Hub'
    AND is_demo = 1
);

INSERT INTO opportunities
  (title, organisation, description, opportunity_type, required_skills,
   location, is_remote, eligibility, application_deadline, application_url,
   source_name, is_demo, is_active)
SELECT
  'Digital Marketing Assistant',
  'Demo Media Lab',
  'Demo listing: plan social posts, write short-form content, review basic SEO, and help run email campaigns for small business clients.',
  'job',
  'Social Media Marketing, Content Writing, SEO, Email Marketing',
  'Bulawayo',
  1,
  'Good written English, a creative portfolio, and the ability to manage several small campaigns.',
  DATE_ADD(CURDATE(), INTERVAL 21 DAY),
  'https://www.linkedin.com/jobs/search/?keywords=Digital%20Marketing%20Assistant&location=Zimbabwe',
  'LinkedIn job search (demo)',
  1,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM opportunities
  WHERE title = 'Digital Marketing Assistant'
    AND organisation = 'Demo Media Lab'
    AND is_demo = 1
);

INSERT INTO opportunities
  (title, organisation, description, opportunity_type, required_skills,
   location, is_remote, eligibility, application_deadline, application_url,
   source_name, is_demo, is_active)
SELECT
  'IT Support Assistant',
  'Demo Systems Co',
  'Demo listing: help staff with laptops, accounts, printers, and basic network problems. Log support requests and document common fixes.',
  'job',
  'Technical Support, Networking Basics, Troubleshooting, Communication',
  'Harare',
  0,
  'A basic IT qualification or hands-on experience supporting Windows devices and office networks.',
  DATE_ADD(CURDATE(), INTERVAL 18 DAY),
  'https://www.linkedin.com/jobs/search/?keywords=IT%20Support%20Assistant&location=Zimbabwe',
  'LinkedIn job search (demo)',
  1,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM opportunities
  WHERE title = 'IT Support Assistant'
    AND organisation = 'Demo Systems Co'
    AND is_demo = 1
);

INSERT INTO opportunities
  (title, organisation, description, opportunity_type, required_skills,
   location, is_remote, eligibility, application_deadline, application_url,
   source_name, is_demo, is_active)
SELECT
  'UI/UX Design Trainee',
  'Demo Design Studio',
  'Demo listing: turn user research into wireframes and clickable prototypes in Figma. Join design reviews and help test new features with users.',
  'job',
  'UI Design, UX Research, Figma',
  'Zimbabwe',
  1,
  'A design portfolio showing at least two projects, even if they are practice projects.',
  DATE_ADD(CURDATE(), INTERVAL 28 DAY),
  'https://www.linkedin.com/jobs/search/?keywords=UI%20UX%20Designer&location=Zimbabwe',
  'LinkedIn job search (demo)',
  1,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM opportunities
  WHERE title = 'UI/UX Design Trainee'
    AND organisation = 'Demo Design Studio'
    AND is_demo = 1
);

INSERT INTO opportunities
  (title, organisation, description, opportunity_type, required_skills,
   location, is_remote, eligibility, application_deadline, application_url,
   source_name, is_demo, is_active)
SELECT
  'Agriculture Data Assistant',
  'Demo AgriTech',
  'Demo listing: collect field data, keep spreadsheets accurate, and prepare simple charts that help agronomists compare crop results.',
  'job',
  'Excel, Data Visualization, Communication, Problem Solving',
  'Harare',
  0,
  'Comfortable working with field teams and spreadsheets; an agriculture or statistics background is helpful.',
  DATE_ADD(CURDATE(), INTERVAL 35 DAY),
  'https://www.linkedin.com/jobs/search/?keywords=Agriculture%20Data%20Assistant&location=Zimbabwe',
  'LinkedIn job search (demo)',
  1,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM opportunities
  WHERE title = 'Agriculture Data Assistant'
    AND organisation = 'Demo AgriTech'
    AND is_demo = 1
);

-- Demo internships, training, courses, and scholarships. Each record links to
-- a live search or learning page so the apply/enrol action can be exercised.
INSERT INTO opportunities
  (title, organisation, description, opportunity_type, required_skills,
   location, is_remote, eligibility, application_deadline, application_url,
   source_name, is_demo, is_active)
SELECT
  v.title, v.organisation, v.description, v.opportunity_type,
  v.required_skills, v.location, v.is_remote, v.eligibility,
  v.application_deadline, v.application_url, v.source_name, 1, 1
FROM (
  SELECT
    'Software Engineering Intern' AS title,
    'Demo Cloud Works' AS organisation,
    'Demo listing: join a small engineering team to build internal tools, write tests, and review code with a mentor.' AS description,
    'internship' AS opportunity_type,
    'JavaScript, React, Git, Problem Solving' AS required_skills,
    'Harare' AS location,
    1 AS is_remote,
    'Final-year student or recent graduate in computer science or a related field.' AS eligibility,
    DATE_ADD(CURDATE(), INTERVAL 45 DAY) AS application_deadline,
    'https://www.linkedin.com/jobs/search/?keywords=Software%20Engineering%20Intern&location=Zimbabwe' AS application_url,
    'LinkedIn job search (demo)' AS source_name
  UNION ALL
  SELECT
    'Data Analytics Intern',
    'Demo Insights Lab',
    'Demo listing: support the analytics team with data cleaning, spreadsheet models, and weekly dashboard updates.',
    'internship',
    'SQL, Excel, Statistics, Data Visualization',
    'Zimbabwe',
    1,
    'Students or graduates in statistics, economics, data science, or a related discipline.',
    DATE_ADD(CURDATE(), INTERVAL 38 DAY),
    'https://www.linkedin.com/jobs/search/?keywords=Data%20Analytics%20Intern&location=Zimbabwe',
    'LinkedIn job search (demo)'
  UNION ALL
  SELECT
    'Full-Stack Web Development Bootcamp',
    'Demo Skills Academy',
    'Demo listing: a guided bootcamp covering responsive front ends, APIs, databases, and a final full-stack project.',
    'training',
    'HTML, CSS, JavaScript, Node.js, SQL',
    'Zimbabwe',
    1,
    'No prior coding experience required; access to a computer and reliable internet is needed.',
    DATE_ADD(CURDATE(), INTERVAL 60 DAY),
    'https://www.linkedin.com/learning/search?keywords=Full%20Stack%20Web%20Development',
    'LinkedIn Learning (demo)'
  UNION ALL
  SELECT
    'Data Analysis with Excel and SQL',
    'Demo Skills Academy',
    'Demo listing: practical training in spreadsheet analysis, SQL queries, and clear data storytelling.',
    'training',
    'Excel, SQL, Data Visualization',
    'Zimbabwe',
    1,
    'Basic spreadsheet experience is helpful; beginners are welcome.',
    DATE_ADD(CURDATE(), INTERVAL 50 DAY),
    'https://www.linkedin.com/learning/search?keywords=Data%20Analysis%20Excel%20SQL',
    'LinkedIn Learning (demo)'
  UNION ALL
  SELECT
    'React Front-End Development Course',
    'Demo Learn Hub',
    'Demo listing: self-paced lessons on components, state, hooks, and building a portfolio-ready React project.',
    'course',
    'HTML, CSS, JavaScript, React',
    'Online',
    1,
    'Comfortable with basic HTML, CSS, and JavaScript before starting.',
    DATE_ADD(CURDATE(), INTERVAL 90 DAY),
    'https://www.freecodecamp.org/learn/front-end-development-libraries/',
    'freeCodeCamp (demo link)'
  UNION ALL
  SELECT
    'Digital Marketing Fundamentals',
    'Demo Learn Hub',
    'Demo listing: learn how to plan campaigns, write effective content, improve search visibility, and measure results.',
    'course',
    'Social Media Marketing, Content Writing, SEO, Email Marketing',
    'Online',
    1,
    'Open to beginners; no marketing qualification is required.',
    DATE_ADD(CURDATE(), INTERVAL 90 DAY),
    'https://learndigital.withgoogle.com/digitalgarage/course/digital-marketing',
    'Google Digital Garage (demo link)'
  UNION ALL
  SELECT
    'Women in Technology Scholarship',
    'Demo Education Trust',
    'Demo listing: tuition support and mentoring for women studying an undergraduate technology qualification.',
    'scholarship',
    'Communication, Problem Solving',
    'Zimbabwe',
    0,
    'Women enrolled in an undergraduate technology programme at a recognised Zimbabwean institution.',
    DATE_ADD(CURDATE(), INTERVAL 55 DAY),
    'https://www.scholarships.com/',
    'Scholarships.com (demo)'
  UNION ALL
  SELECT
    'STEM Futures Scholarship',
    'Demo Education Trust',
    'Demo listing: partial tuition support for undergraduate students in science, technology, engineering, or mathematics.',
    'scholarship',
    'Statistics, Problem Solving, Communication',
    'Zimbabwe',
    0,
    'Undergraduate students in a STEM discipline with a strong academic record.',
    DATE_ADD(CURDATE(), INTERVAL 65 DAY),
    'https://www.scholarships.com/',
    'Scholarships.com (demo)'
) AS v
WHERE NOT EXISTS (
  SELECT 1 FROM opportunities AS existing
  WHERE existing.title = v.title
    AND existing.organisation = v.organisation
    AND existing.is_demo = 1
);
