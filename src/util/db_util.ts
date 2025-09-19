import { EmployeeModel, Employee, IEmployee } from "../models/Employee";
import { TreatmentModel } from "../models/Treatment";

export const customerLookup = (cusId: number) => {};

export const employeeLookup = (empId: number) => {
  const employee = EmployeeModel.findOne({ id: empId }).exec();
  return employee;
};

export const employeeLookupByName = (name: string) => {
  const employee = EmployeeModel.findOne({ DisplayName: name });
  return employee;
};

export const treatmentLookup = (treatId: number) => {
  const treatment = TreatmentModel.findOne({ id: treatId }).exec();
  return treatment;
};

export const getTreatmentIds = async (): Promise<Number[]> => {
  const treatments = await TreatmentModel.find().exec();
  return treatments.map((treatment) => treatment.id);
};

const employees: string[] = [
  "Aaliyah Becker",
  "Aaliyah Wilderman",
  "Aaron Kshlerin-Jacobi",
  "Abdiel Cole",
  "Abdullah Mraz",
  "Abhishek Jha",
  "Abigail c",
  "Abigale Green",
  "Ada Bogan",
  "Adele Roob",
  "Adele Metz",
  "Adeline Von",
  "Adell Quigley",
  "Adell Zieme",
  "Adella Emard",
  "Adolfo Toy",
  "Adrian Gibson",
  "Afton Hayes",
  "Agincy Guy",
  "Ahmad Hermann",
  "Akeem McGlynn",
  "Alanis Buckridge",
  "Alanna Boyle",
  "Alberta Turcotte",
  "Alberto West",
  "Albin Corkery",
  "Albin Grant",
  "Albin Upton-Murazik",
  "Aleen Dietrich",
  "Alejandra Wunsch",
  "Alessandro Kemmer",
  "Alessandro Emmerich",
  "Alex Theodoridis - Updated",
  "Alexander Wolf",
  "Alexandra Sawayn",
  "Alexandro Lemke",
  "Alford Gibson",
  "Alfred Alfred",
  "Alfreda Wolff",
  "Alfredo Kassulke",
  "Alia Gleason",
  "Alice King-Farrell",
  "Alivia Aufderhar",
  "Aliya Christiansen",
  "Aliyah Mitchell",
  "Aliza Feil",
  "Aliza Bosco",
  "Alize Kassulke",
  "Allison Ayers",
  "Alvena Kutch",
  "Alvera Schinner",
  "Alvina Lueilwitz",
  "Alvis Abernathy",
  "Alysson Upton",
  "Amara Dooley",
  "Americo Jerde",
  "Amira Hodkiewicz",
  "Amos Simonis",
  "Amya Wunsch",
  "Ana Sawayn",
  "Anabelle Greenfelder",
  "Anabelle Yundt",
  "Anais Tromp",
  "Anderson Feil",
  "Andreane Stehr",
  "Andres Abernathy",
  "Andrew Gutmann",
  "Andrew Archer",
  "Andy Labadie",
  "Angelica Weber",
  "Anibal Langworth",
  "Anissa Davis",
  "Aniya Bernhard-Mohr",
  "Aniyah Kutch",
  "Anna c",
  "Annabell Bashirian",
  "Annabelle Zulauf",
  "Annabelle Haley",
  "Annalise Zieme",
  "Annamae Schamberger",
  "Annamae Strosin",
  "Annamae Quigley",
  "Annamarie Kuvalis",
  "Anne Doyle",
  "Ansley Gutmann",
  "Anthony Atwood",
  "Antonetta Little",
  "Antonietta Leuschke",
  "Antonina Harber",
  "Anya O'Kon",
  "April Schneider",
  "Aracely Wiza",
  "Aracely Hessel",
  "Arch Boyer",
  "Ardella Considine",
  "Arden Leannon",
  "Ardith Swaniawski",
  "Arely Nikolaus",
  "Ari Terry",
  "Ariane Moore",
];

export const please_work = async () => {
  const orderedEmployeeIds: number[] = [];

  for (const x in employees) {
    const emp = await employeeLookupByName(x);
    console.log(emp);
    orderedEmployeeIds.push(emp ? emp.ID : -1);
  }

  console.log(orderedEmployeeIds);
};
