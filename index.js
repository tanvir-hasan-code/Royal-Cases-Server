const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const courtCollections = client.db("Royal-Cases").collection("courts");
    const CaseTypeCollections = client
      .db("Royal-Cases")
      .collection("caseTypes");
    const policeStationCollections = client
      .db("Royal-Cases")
      .collection("policeStations");
    const CompanyCollections = client.db("Royal-Cases").collection("companies");
    const AllCasesCollections = client
      .db("Royal-Cases")
      .collection("all-cases");
    const DailyNotesCollection = client.db("Royal-Cases").collection("notes");

    // Add Cases
    app.post("/add-cases", async (req, res) => {
      try {
        const {
          fileNo,
          caseNo,
          date,
          company,
          firstParty,
          secondParty,
          appointedBy,
          caseType,
          court,
          policeStation,
          fixedFor,
          mobileNo,
          lawSection,
          comments,
        } = req.body;

        if (!fileNo || !caseNo || !court || !firstParty || !date) {
          return res.status(400).json({
            error: "Required fields are missing.",
          });
        }

        const existingCase = await AllCasesCollections.findOne({
          fileNo,
          caseNo,
          court,
        });

        if (existingCase) {
          return res.status(400).json({
            error: "This case already exists.",
          });
        }

        const newCase = {
          ...req.body,
          date: new Date(req.body.date),
          status: "Pending",
          createdAt: new Date(),
        };

        const result = await AllCasesCollections.insertOne(newCase);

        res.status(201).json({
          message: "Case added successfully!",
          data: result,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
      }
    });

    // Dashboard Count Cases
    // ==================== Dashboard Counts API ====================

    // All Cases Count
    app.get("/dashboard/all-cases-count", async (req, res) => {
      try {
        const count = await AllCasesCollections.countDocuments();
        res.send({ count });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Running Cases Count
    app.get("/dashboard/running-cases-count", async (req, res) => {
      try {
        const count = await AllCasesCollections.countDocuments({
          status: "Running",
        });
        res.send({ count });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Completed Cases Count
    app.get("/dashboard/completed-cases-count", async (req, res) => {
      try {
        const count = await AllCasesCollections.countDocuments({
          status: "Completed",
        });
        res.send({ count });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Not Updated / Pending Cases Count
    app.get("/dashboard/pending-cases-count", async (req, res) => {
      try {
        const count = await AllCasesCollections.countDocuments({
          status: "Pending",
        });
        res.send({ count });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Pending Cases API
    app.get("/cases/pending", async (req, res) => {
      try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 8;
        const search = req.query.search || "";

        const query = {
          status: "Pending",
        };

        if (search) {
          query.caseNo = { $regex: search, $options: "i" };
        }

        const total = await AllCasesCollections.countDocuments(query);

        const cases = await AllCasesCollections.find(query)
          .sort({ createdAt: -1 }) // latest first
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        res.send({
          cases,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    app.get("/dashboard/todays-cases-count", async (req, res) => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // আজকের শুরু (00:00)

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1); // আগামীকালের শুরু

        const count = await AllCasesCollections.countDocuments({
          date: {
            $gte: today,
            $lt: tomorrow,
          },
        });

        res.send({ count });
      } catch (err) {
        console.error("Today's cases count error:", err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Todays Case API
    app.get("/cases/today", async (req, res) => {
      try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 8;
        const search = req.query.search || "";

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const query = {
          date: { $gte: today, $lt: tomorrow },
        };
        if (search) {
          query.caseNo = { $regex: search, $options: "i" };
        }
        const total = await AllCasesCollections.countDocuments(query);
        const cases = await AllCasesCollections.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();
        res.send({
          cases,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });
    // Tomorrow Cases API
    app.get("/cases/tomorrow", async (req, res) => {
      try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 8;
        const search = req.query.search || "";

        // Today 00:00
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Tomorrow 00:00
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Day after tomorrow 00:00
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(tomorrow.getDate() + 1);

        const query = {
          date: { $gte: tomorrow, $lt: dayAfterTomorrow },
        };

        if (search) {
          query.caseNo = { $regex: search, $options: "i" };
        }

        const total = await AllCasesCollections.countDocuments(query);

        const cases = await AllCasesCollections.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        res.send({
          cases,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    app.get("/dashboard/tomorrows-cases-count", async (req, res) => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(today.getDate() + 2);

        const count = await AllCasesCollections.countDocuments({
          date: {
            $gte: tomorrow,
            $lt: dayAfterTomorrow,
          },
        });

        res.send({ count });
      } catch (err) {
        console.error("Tomorrow's cases count error:", err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // ==================== All Notes Count ====================
    app.get("/dashboard/all-notes-count", async (req, res) => {
      try {
        const count = await DailyNotesCollection.countDocuments();
        res.send({ count });
      } catch (err) {
        console.error("Error fetching all notes count:", err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // ==================== Today's Notes Count ====================
    app.get("/dashboard/todays-notes-count", async (req, res) => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const count = await DailyNotesCollection.countDocuments({
          createdAt: { $gte: today, $lt: tomorrow },
        });

        res.send({ count });
      } catch (err) {
        console.error("Error fetching today's notes count:", err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Notes Post API
    app.post("/daily-notes", async (req, res) => {
      try {
        const note = {
          ...req.body,
          createdAt: new Date(),
        };

        const result = await DailyNotesCollection.insertOne(note);
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to save note" });
      }
    });
    // GET
    app.get("/daily-notes", async (req, res) => {
      const result = await DailyNotesCollection.find()
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // DELETE
    app.delete("/daily-notes/:id", async (req, res) => {
      const result = await DailyNotesCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // UPDATE
    app.patch("/daily-notes/:id", async (req, res) => {
      const result = await DailyNotesCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { note: req.body.note } },
      );
      res.send(result);
    });

    // All Cases
    app.get("/cases", async (req, res) => {
      try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search?.trim() || "";
        const company = req.query.company?.trim() || "";
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const query = {};

        // Company filter
        if (company) query.company = company;

        // Text search in multiple fields
        if (search) {
          query.$or = [
            { caseNo: { $regex: search, $options: "i" } },
            { policeStation: { $regex: search, $options: "i" } },
            { comments: { $regex: search, $options: "i" } },
            { firstParty: { $regex: search, $options: "i" } },
            { secondParty: { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
            { lawSection: { $regex: search, $options: "i" } },
          ];
        }

        // Date range filter on `date` array
        if (startDate || endDate) {
          query.date = {};
          if (startDate) query.date.$gte = new Date(startDate);
          if (endDate) query.date.$lte = new Date(endDate);
        }

        const statusOrder = { Pending: 1, Running: 2, Completed: 3 };

        let cases = await AllCasesCollections.find(query).toArray();

        // Sorting
        cases.sort((a, b) => {
          const statusDiff =
            (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
          if (statusDiff !== 0) return statusDiff;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const total = cases.length;
        const paginatedCases = cases.slice((page - 1) * limit, page * limit);

        res.send({
          cases: paginatedCases,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    app.get("/cases/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await AllCasesCollections.findOne(query);
      res.send(result);
    });
    // Update Case Details (description, laws, fees)
    app.put("/cases/:id", async (req, res) => {
      const { id } = req.params;
      const { description, laws, fees } = req.body;

      if (!ObjectId.isValid(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Case ID" });
      }

      try {
        const updateData = {};

        if (description !== undefined) updateData.description = description;
        if (laws !== undefined) updateData.laws = laws;
        if (fees !== undefined) {
          // Ensure fees.payable is a number
          updateData.fees = {
            payable: Number(fees.payable) || 0,
            paid: fees.paid ? Number(fees.paid) : 0, // keep existing paid if needed
          };
        }

        const result = await AllCasesCollections.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData },
        );

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Case not found" });
        }

        return res.status(200).json({
          success: true,
          message: "Case details updated successfully",
        });
      } catch (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          message: "Failed to update case details",
        });
      }
    });

    app.patch("/cases/add-date/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { date, fixedFor } = req.body;

        if (!date || !fixedFor) {
          return res
            .status(400)
            .send({ message: "date and fixedFor required" });
        }

        const query = { _id: new ObjectId(id) };
        const existingCase = await AllCasesCollections.findOne(query);

        if (!existingCase) {
          return res.status(404).send({ message: "Case not found" });
        }

        // Ensure `date` is an array
        let updatedDates = [];
        if (Array.isArray(existingCase.date)) {
          updatedDates = existingCase.date;
        } else if (existingCase.date) {
          updatedDates = [existingCase.date]; // convert single date to array
        }

        // Ensure `fixedFor` is an array
        let updatedFixedFor = [];
        if (Array.isArray(existingCase.fixedFor)) {
          updatedFixedFor = existingCase.fixedFor;
        } else if (existingCase.fixedFor) {
          updatedFixedFor = [existingCase.fixedFor]; // convert single fixedFor to array
        }

        // Push new values
        updatedDates.push(new Date(date));
        updatedFixedFor.push(fixedFor);

        const updateResult = await AllCasesCollections.findOneAndUpdate(
          query,
          { $set: { date: updatedDates, fixedFor: updatedFixedFor } },
          { returnDocument: "after" }, // return updated document
        );

        res.send(updateResult.value);
      } catch (error) {
        console.error("Add date error:", error);
        res.status(500).send({ message: "Failed to add date" });
      }
    });

    app.get("/running-cases", async (req, res) => {
      try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 8;
        const search = req.query.search || "";

        // Base query
        const query = {
          status: "Running",
        };

        if (search) {
          query.caseNo = { $regex: search, $options: "i" };
        }

        // Count total filtered documents
        const total = await AllCasesCollections.countDocuments(query);

        // Fetch paginated data
        const cases = await AllCasesCollections.find(query)
          .sort({ createdAt: -1 }) // newest first
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        res.send({
          cases,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });
    app.get("/complete-cases", async (req, res) => {
      try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 8;
        const search = req.query.search || "";

        const query = {
          status: "Completed",
        };

        if (search) {
          query.caseNo = { $regex: search, $options: "i" };
        }

        const total = await AllCasesCollections.countDocuments(query);

        const cases = await AllCasesCollections.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        res.send({
          cases,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Update Case (Status / Other fields)
    app.patch("/cases/:id", async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;

      try {
        const result = await AllCasesCollections.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: updateData,
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Case not found",
          });
        }

        res.json({
          success: true,
          message: "Case updated successfully",
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          message: "Failed to update case",
        });
      }
    });

    // Update Case API
    app.put("/update-case/:id", async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;

      const requiredFields = [
        "fileNo",
        "caseNo",
        "date",
        "court",
        "firstParty",
      ];

      for (const field of requiredFields) {
        if (!updateData[field] || updateData[field].trim() === "") {
          return res.status(400).json({
            field,
            message: `${field} is required`,
          });
        }
      }

      try {
        if (updateData.date) {
          updateData.date = new Date(updateData.date + "T00:00:00.000Z");
        }
        const result = await AllCasesCollections.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData },
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            message: "Case not found",
          });
        }

        if (result.modifiedCount === 0) {
          return res.status(200).json({
            message: "No changes were made",
          });
        }

        return res.status(200).json({
          message: "Case updated successfully!",
        });
      } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Failed to update case",
        });
      }
    });

    // Delete Case
    app.delete("/cases/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await AllCasesCollections.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Case not found",
          });
        }

        res.json({
          success: true,
          message: "Case deleted successfully",
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          message: "Failed to delete case",
        });
      }
    });

    // Courts Section
    app.post("/courts", async (req, res) => {
      const { name } = req.body;

      if (!name) {
        return res.status(400).send({ message: "Court name required" });
      }

      const exists = await courtCollections.findOne({ name });

      if (exists) {
        return res.status(409).send({ message: "Court already exists" });
      }

      const result = await courtCollections.insertOne({
        name,
        createdAt: new Date(),
      });

      res.send(result);
    });

    // ==================== UPDATE COURT ====================
    app.patch("/courts/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
          return res.status(400).send({ message: "Court name is required" });
        }

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid Court ID" });
        }

        const result = await courtCollections.updateOne(
          { _id: new ObjectId(id) },
          { $set: { name: name.trim() } },
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Court not found" });
        }

        res.send({ message: "Court updated successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // ==================== DELETE COURT ====================
    app.delete("/courts/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid Court ID" });
        }

        const result = await courtCollections.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Court not found" });
        }

        res.send({ message: "Court deleted successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/courts", async (req, res) => {
      const result = await courtCollections.find().toArray();
      res.send(result);
    });

    // Case Type Section
    app.post("/cases-type", async (req, res) => {
      const { name } = req.body;

      if (!name) {
        return res.status(400).send({ message: "Cases Type required" });
      }

      const exists = await CaseTypeCollections.findOne({ name });

      if (exists) {
        return res.status(409).send({ message: "Cases Type already exists" });
      }

      const result = await CaseTypeCollections.insertOne({
        name,
        createdAt: new Date(),
      });

      res.send(result);
    });

    // Update case type
    app.patch("/cases-type/:id", async (req, res) => {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) return res.status(400).send({ message: "Name required" });

      try {
        const result = await CaseTypeCollections.updateOne(
          { _id: new ObjectId(id) },
          { $set: { name, updatedAt: new Date() } },
        );

        if (result.matchedCount === 0)
          return res.status(404).send({ message: "Case type not found" });

        res.send({ message: "Case type updated successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Delete case type
    app.delete("/cases-type/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await CaseTypeCollections.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0)
          return res.status(404).send({ message: "Case type not found" });

        res.send({ message: "Case type deleted successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });
    app.get("/cases-type", async (req, res) => {
      const result = await CaseTypeCollections.find().toArray();
      res.send(result);
    });

    // Police Station Section
    app.post("/police-station", async (req, res) => {
      const { name } = req.body;

      if (!name) {
        return res.status(400).send({ message: "Police Station required" });
      }

      const exists = await policeStationCollections.findOne({ name });

      if (exists) {
        return res
          .status(409)
          .send({ message: "Police Station already exists" });
      }

      const result = await policeStationCollections.insertOne({
        name,
        createdAt: new Date(),
      });

      res.send(result);
    });
    // Update police station
    app.patch("/police-station/:id", async (req, res) => {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) return res.status(400).send({ message: "Name required" });

      try {
        const result = await policeStationCollections.updateOne(
          { _id: new ObjectId(id) },
          { $set: { name, updatedAt: new Date() } },
        );

        if (result.matchedCount === 0)
          return res.status(404).send({ message: "Police station not found" });

        res.send({ message: "Police station updated successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Delete police station
    app.delete("/police-station/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await policeStationCollections.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0)
          return res.status(404).send({ message: "Police station not found" });

        res.send({ message: "Police station deleted successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    app.get("/police-station", async (req, res) => {
      const result = await policeStationCollections.find().toArray();
      res.send(result);
    });

    // Company Section
    app.post("/companies", async (req, res) => {
      const { name } = req.body;

      if (!name) {
        return res.status(400).send({ message: "Company name required" });
      }

      const exists = await CompanyCollections.findOne({ name });

      if (exists) {
        return res.status(409).send({ message: "Company already exists" });
      }

      const result = await CompanyCollections.insertOne({
        name,
        createdAt: new Date(),
      });

      res.send(result);
    });

    // UPDATE Company
    app.patch("/companies/:id", async (req, res) => {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) {
        return res.status(400).send({ message: "Company name required" });
      }

      const exists = await CompanyCollections.findOne({
        name,
        _id: { $ne: new ObjectId(id) },
      });

      if (exists) {
        return res.status(409).send({ message: "Company already exists" });
      }

      const result = await CompanyCollections.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            name,
            updatedAt: new Date(),
          },
        },
      );

      res.send(result);
    });

    // DELETE Company
    app.delete("/companies/:id", async (req, res) => {
      const { id } = req.params;

      const result = await CompanyCollections.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).send({ message: "Company not found" });
      }

      res.send({ message: "Company deleted successfully" });
    });

    app.get("/companies", async (req, res) => {
      const result = await CompanyCollections.find().toArray();
      res.send(result);
    });

    app.get("/", (req, res) => {
      res.send("Welcome Royal Cases!");
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!",
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
