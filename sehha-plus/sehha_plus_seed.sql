-- ============================================================
--  Sehha Plus — Full Database Seed
--  Run this in SSMS (F5) to create and populate SehhaPlus DB
-- ============================================================

USE master;
GO

IF DB_ID('SehhaPlus') IS NOT NULL
BEGIN
    ALTER DATABASE SehhaPlus SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE SehhaPlus;
END
GO

CREATE DATABASE SehhaPlus;
GO
USE SehhaPlus;
GO

-- ============================================================
--  TABLES
-- ============================================================

CREATE TABLE Users (
    UserID    INT IDENTITY(1,1) PRIMARY KEY,
    FullName  NVARCHAR(100) NOT NULL,
    Email     NVARCHAR(150) NOT NULL UNIQUE,
    Password  NVARCHAR(200) NOT NULL,
    Role      NVARCHAR(20)  NOT NULL CHECK (Role IN ('patient','doctor','manager')),
    Phone     NVARCHAR(20)
);

CREATE TABLE Clinics (
    ClinicID  INT IDENTITY(1,1) PRIMARY KEY,
    NameAR    NVARCHAR(100) NOT NULL,
    NameEN    NVARCHAR(100) NOT NULL,
    Area      NVARCHAR(100),
    Address   NVARCHAR(200)
);

CREATE TABLE Doctors (
    DoctorID      INT IDENTITY(1,1) PRIMARY KEY,
    UserID        INT NOT NULL REFERENCES Users(UserID),
    ClinicID      INT NOT NULL REFERENCES Clinics(ClinicID),
    SpecialtyAR   NVARCHAR(100),
    SpecialtyEN   NVARCHAR(100),
    WorkStart     TIME,
    WorkEnd       TIME,
    ConsultFee    DECIMAL(10,2),
    SlotDuration  INT DEFAULT 30
);

CREATE TABLE Patients (
    PatientID       INT IDENTITY(1,1) PRIMARY KEY,
    UserID          INT NOT NULL REFERENCES Users(UserID),
    DateOfBirth     DATE,
    Gender          NVARCHAR(10),
    BloodType       NVARCHAR(5),
    Allergies       NVARCHAR(300),
    ChronicDiseases NVARCHAR(300)
);

CREATE TABLE Appointments (
    AppointmentID INT IDENTITY(1,1) PRIMARY KEY,
    BookingCode   NVARCHAR(20)  NOT NULL,
    PatientID     INT NOT NULL REFERENCES Patients(PatientID),
    DoctorID      INT NOT NULL REFERENCES Doctors(DoctorID),
    AppDate       DATE          NOT NULL,
    AppTime       TIME          NOT NULL,
    Status        NVARCHAR(20)  NOT NULL DEFAULT 'pending'
                  CHECK (Status IN ('pending','confirmed','attended','no_show','cancelled')),
    Notes         NVARCHAR(500) DEFAULT ''
);

CREATE TABLE TreatmentPlans (
    PlanID    INT IDENTITY(1,1) PRIMARY KEY,
    PatientID INT NOT NULL REFERENCES Patients(PatientID),
    DoctorID  INT NOT NULL REFERENCES Doctors(DoctorID),
    TitleAR   NVARCHAR(200),
    TitleEN   NVARCHAR(200),
    StartDate DATE,
    Status    NVARCHAR(20) DEFAULT 'active'
);

CREATE TABLE TreatmentSteps (
    StepID        INT IDENTITY(1,1) PRIMARY KEY,
    PlanID        INT NOT NULL REFERENCES TreatmentPlans(PlanID),
    StepOrder     INT NOT NULL,
    TitleAR       NVARCHAR(200),
    TitleEN       NVARCHAR(200),
    DescriptionAR NVARCHAR(500),
    DescriptionEN NVARCHAR(500),
    Status        NVARCHAR(20) DEFAULT 'locked'
                  CHECK (Status IN ('locked','in_progress','completed')),
    CompletedDate DATE
);
GO

-- ============================================================
--  VIEWS
-- ============================================================

CREATE VIEW vw_PatientHistory AS
SELECT
    a.AppointmentID,
    a.BookingCode,
    a.AppDate,
    a.AppTime,
    a.Status,
    a.Notes,
    pu.FullName  AS PatientName,
    du.FullName  AS DoctorName,
    d.SpecialtyAR,
    d.SpecialtyEN,
    c.NameAR     AS ClinicNameAR,
    c.NameEN     AS ClinicNameEN
FROM Appointments a
JOIN Patients  pt ON a.PatientID = pt.PatientID
JOIN Users     pu ON pt.UserID   = pu.UserID
JOIN Doctors   d  ON a.DoctorID  = d.DoctorID
JOIN Users     du ON d.UserID    = du.UserID
JOIN Clinics   c  ON d.ClinicID  = c.ClinicID;
GO

CREATE VIEW vw_NoShowByClinic AS
SELECT
    c.ClinicID,
    c.NameAR AS ClinicNameAR,
    c.NameEN AS ClinicNameEN,
    c.Area,
    COUNT(a.AppointmentID)                                       AS TotalApps,
    SUM(CASE WHEN a.Status = 'no_show'  THEN 1 ELSE 0 END)      AS NoShows,
    SUM(CASE WHEN a.Status = 'attended' THEN 1 ELSE 0 END)      AS Attended,
    CASE
        WHEN COUNT(a.AppointmentID) = 0 THEN 0
        ELSE CAST(
            SUM(CASE WHEN a.Status='no_show' THEN 1 ELSE 0 END) * 100.0
            / COUNT(a.AppointmentID) AS DECIMAL(5,2))
    END AS NoShowRate
FROM Clinics c
LEFT JOIN Doctors      d ON d.ClinicID  = c.ClinicID
LEFT JOIN Appointments a ON a.DoctorID  = d.DoctorID
GROUP BY c.ClinicID, c.NameAR, c.NameEN, c.Area;
GO

-- ============================================================
--  SEED DATA
-- ============================================================

-- Password for all demo accounts = sehha123
-- auth.py accepts plain "sehha123" when hash starts with "$2b$12$demo_hash"

-- Users
INSERT INTO Users (FullName, Email, Password, Role, Phone) VALUES
(N'أحمد الزعترة',      'ahmed@sehha.jo',   '$2b$12$demo_hash_patient1', 'patient', '0791000001'),
(N'سارة النجار',       'sara@sehha.jo',    '$2b$12$demo_hash_patient2', 'patient', '0791000002'),
(N'د. مها الحسن',      'maha@sehha.jo',    '$2b$12$demo_hash_doctor1',  'doctor',  '0791000010'),
(N'د. خالد عبد الله',  'khaled@sehha.jo',  '$2b$12$demo_hash_doctor2',  'doctor',  '0791000011'),
(N'د. ليلى منصور',     'layla@sehha.jo',   '$2b$12$demo_hash_doctor3',  'doctor',  '0791000012'),
(N'د. عمر الرشيد',     'omar@sehha.jo',    '$2b$12$demo_hash_doctor4',  'doctor',  '0791000013'),
(N'مدير النظام',       'manager@sehha.jo', '$2b$12$demo_hash_manager1', 'manager', '0791000099');

-- Clinics (Dr. Ahmad's 4-clinic network in Amman)
INSERT INTO Clinics (NameAR, NameEN, Area, Address) VALUES
(N'عيادة الرابية',     'Al-Rabiah Clinic',   N'الرابية',     N'شارع الرابية، عمان'),
(N'عيادة الجبيهة',    'Al-Jubayhah Clinic', N'الجبيهة',     N'شارع الجامعة، الجبيهة'),
(N'عيادة الشميساني',  'Shmeisani Clinic',   N'الشميساني',   N'شارع الثقافة، الشميساني'),
(N'عيادة الأردن',     'Jordan Clinic',      N'وسط البلد',   N'شارع الأردن، وسط عمان');

-- Doctors
INSERT INTO Doctors (UserID, ClinicID, SpecialtyAR, SpecialtyEN, WorkStart, WorkEnd, ConsultFee, SlotDuration) VALUES
(3, 1, N'طب عام',          'General Medicine',  '08:00', '16:00', 25.00, 30),
(4, 2, N'طب الأسنان',      'Dentistry',         '09:00', '17:00', 35.00, 30),
(5, 3, N'طب الأطفال',      'Pediatrics',        '10:00', '18:00', 30.00, 30),
(6, 4, N'الأمراض الباطنية','Internal Medicine', '08:00', '14:00', 40.00, 30);

-- Patients
INSERT INTO Patients (UserID, DateOfBirth, Gender, BloodType, Allergies, ChronicDiseases) VALUES
(1, '1995-06-15', N'ذكر',   'A+', N'البنسلين',          N'ضغط دم مرتفع'),
(2, '1990-03-22', N'أنثى',  'O+', N'لا يوجد',           N'سكري النوع الثاني');

-- Appointments (mix of statuses for demo)
INSERT INTO Appointments (BookingCode, PatientID, DoctorID, AppDate, AppTime, Status, Notes) VALUES
('B-1001', 1, 1, '2026-05-10', '09:00', 'attended',  N'مراجعة روتينية'),
('B-1002', 1, 1, '2026-05-17', '10:00', 'no_show',   N''),
('B-1003', 1, 2, '2026-05-20', '11:00', 'confirmed', N'فحص الأسنان'),
('B-1004', 1, 1, '2026-05-25', '09:30', 'pending',   N''),
('B-1005', 2, 3, '2026-05-12', '10:00', 'attended',  N'فحص الأطفال'),
('B-1006', 2, 3, '2026-05-15', '11:00', 'no_show',   N''),
('B-1007', 2, 4, '2026-05-18', '08:30', 'cancelled', N'إلغاء بسبب سفر'),
('B-1008', 2, 3, '2026-05-28', '10:30', 'pending',   N''),
('B-1009', 1, 3, '2026-05-08', '14:00', 'attended',  N''),
('B-1010', 1, 4, '2026-05-13', '08:00', 'no_show',   N'');

-- Treatment Plans
INSERT INTO TreatmentPlans (PatientID, DoctorID, TitleAR, TitleEN, StartDate, Status) VALUES
(1, 1, N'خطة علاج ضغط الدم', 'Blood Pressure Treatment Plan', '2026-05-01', 'active'),
(2, 3, N'متابعة مرض السكري', 'Diabetes Follow-up Plan',       '2026-05-05', 'active');

-- Treatment Steps
INSERT INTO TreatmentSteps (PlanID, StepOrder, TitleAR, TitleEN, DescriptionAR, DescriptionEN, Status, CompletedDate) VALUES
(1, 1, N'الفحص الأولي',       'Initial Checkup',    N'قياس الضغط والفحص السريري', 'Blood pressure measurement and clinical exam', 'completed', '2026-05-01'),
(1, 2, N'تحاليل الدم',        'Blood Tests',        N'تحليل شامل للدم',            'Complete blood count and metabolic panel',     'completed', '2026-05-05'),
(1, 3, N'بدء الدواء',         'Start Medication',   N'بدء دواء الضغط يومياً',      'Begin daily antihypertensive medication',       'in_progress', NULL),
(1, 4, N'المتابعة الشهرية',   'Monthly Follow-up',  N'مراجعة شهرية لقياس الضغط',  'Monthly review to monitor blood pressure',      'locked', NULL),
(2, 1, N'قياس السكر التراكمي','HbA1c Test',         N'تحليل السكر التراكمي',       'Glycated hemoglobin test',                      'completed', '2026-05-05'),
(2, 2, N'برنامج الحمية',      'Diet Program',       N'برنامج غذائي مخصص للسكري',  'Customized diabetic nutrition program',          'in_progress', NULL),
(2, 3, N'ممارسة الرياضة',     'Exercise Plan',      N'30 دقيقة يومياً',            '30 minutes daily physical activity',             'locked', NULL),
(2, 4, N'مراجعة ثلاثية',      'Quarterly Review',   N'مراجعة كل 3 أشهر',          'Review every 3 months',                          'locked', NULL);
GO

PRINT 'SehhaPlus database created and seeded successfully.';
GO
