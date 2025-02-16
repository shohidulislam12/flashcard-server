const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
const port = process.env.PORT || 3000;
app.use(express.json());
const dotenv = require('dotenv');
dotenv.config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGO_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const flashcard = client.db('JobPortal').collection('flashcard');

    //  Add a new flashcard
    app.post("/flashcards", async (req, res) => {
      const { question, answer } = req.body;
      const cardData = {
        question,
        answer,
        level: 1, 
        nextReviewDate: new Date(Date.now()) //  Store as Date object
      };
      const result = await flashcard.insertOne(cardData);
      res.send(result);
    });
//jwt 
app.post('/jwt',async(req,res)=>{

  const useremail=req.body
  console.log(useremail)
  const token=jwt.sign(useremail, process.env.ACESS_TOKEN_SECRET, { expiresIn: '365d' });
  res.send({ token });
})
    //  Get all flashcards
    app.get("/flashcards", async (req, res) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to midnight (start of today)

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1); // Set to midnight (start of tomorrow)

      const result = await flashcard.find({
        nextReviewDate: { $gte: today, $lt: tomorrow }
      }).toArray();
      res.send(result);
    });

    //  Update flashcard (Leitner System logic)
    app.put("/flashcards/:id", async (req, res) => {
      const { id } = req.params;
      const { isCorrect } = req.body;
      const query = { _id: new ObjectId(id) };

      // Fetch the existing flashcard
      const existingFlashcard = await flashcard.findOne(query);
      if (!existingFlashcard) {
        return res.status(404).json({ error: "Flashcard not found" });
      }

      // Update level based on correctness
      let newLevel = isCorrect ? Math.min(existingFlashcard.level + 1, 5) : 1;

      // Set next review date based on new level
      const daysToAdd = newLevel === 1 ? 1 : newLevel === 2 ? 3 : newLevel === 3 ? 7 : newLevel === 4 ? 14 : 30;
      const newReviewDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

      // Update the flashcard in the database
      const update = {
        $set: {
          level: newLevel,
          nextReviewDate: newReviewDate
        }
      };

      const result = await flashcard.updateOne(query, update);
      res.send(result);
    });

//delete card
app.delete("/flashcards/:id", async (req, res) => {
  const { id } = req.params;
 
  const query = { _id: new ObjectId(id) };
  const result = await flashcard.deleteOne(query)
  res.send(result);
});




    //  Server test route
    app.get('/', async (req, res) => {
      res.send('Server running');
    });

  } finally {
    // await client.close(); //
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
