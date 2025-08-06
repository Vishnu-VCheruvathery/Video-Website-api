require('dotenv').config()
const express = require('express');
const app = express()
const cors = require('cors')
const userRouter = require('./routes/userRoutes');
const videoRouter = require('./routes/videoRoutes')



app.use(cors())
app.use(express.json())
app.use('/users', userRouter)
app.use('/videos', videoRouter);


app.listen(3000, () => {
    console.log("Server started on Port 3000")
})