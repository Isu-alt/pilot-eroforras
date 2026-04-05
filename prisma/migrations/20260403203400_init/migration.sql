-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EquipmentDimensions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "length_m" REAL,
    "width_m" REAL,
    "height_m" REAL,
    "tare_kg" INTEGER,
    "gross_kg" INTEGER,
    CONSTRAINT "EquipmentDimensions_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT
);

-- CreateTable
CREATE TABLE "Vacation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "Vacation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "recommendedDate" DATETIME,
    "estimatedEffortHours" REAL,
    "status" TEXT NOT NULL,
    CONSTRAINT "MaintenancePlan_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActualRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT,
    "equipmentId" TEXT,
    "personId" TEXT,
    "actualStart" DATETIME,
    "actualEnd" DATETIME,
    "actualHours" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ActualFinancial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actualRecordId" TEXT NOT NULL,
    "laborCost" REAL,
    "partsCost" REAL,
    "externalCost" REAL,
    "totalCost" REAL,
    CONSTRAINT "ActualFinancial_actualRecordId_fkey" FOREIGN KEY ("actualRecordId") REFERENCES "ActualRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EquipmentInsurance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "insurer" TEXT NOT NULL,
    "policyNumber" TEXT,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "coverageAmount" REAL,
    CONSTRAINT "EquipmentInsurance_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EquipmentPermit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "permitType" TEXT NOT NULL,
    "issueDate" DATETIME,
    "expiryDate" DATETIME,
    CONSTRAINT "EquipmentPermit_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentDimensions_equipmentId_key" ON "EquipmentDimensions"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ActualFinancial_actualRecordId_key" ON "ActualFinancial"("actualRecordId");
