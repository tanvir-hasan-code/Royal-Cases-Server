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
    await client.connect();
    const courtCollections = client.db("Royal-Cases").collection("courts");
    const CaseTypeCollections = client
      .db("Royal-Cases")
      .collection("caseTypes");
    const policeStationCollections = client
      .db("Royal-Cases")
      .collection("policeStations");
    const CompanyCollections = client.db("Royal-Cases").collection("companies");
    const AllCasesCollections = client.db("Royal-Cases").collection("all-cases");

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

    const existingCase = await AllCasesCollections.findOne({ fileNo, caseNo, court });

    if (existingCase) {
      return res.status(400).json({
        error: "This case already exists.",
      });
    }

    const newCase = {
      ...req.body,
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
      res.send("Hello World!");
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
