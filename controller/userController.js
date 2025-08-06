require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../utils/prismaClient');
const {SECRET} = process.env
const jwt = require('jsonwebtoken')

module.exports.SignIn = async(req,res) => {
    const {email, password, firstname, lastname} = req.body;
    try {
        if(!email || !password || !firstname || !lastname){
            return res.status(400).json({message: 'Need all credentials!'})
        }
          const hashedPassword = await bcrypt.hash(password, 10); // ✅ await this!

        console.log('the hash: ', hashedPassword);
            const newUser = await prisma.user.create({
            data: {
                email: email,
                password: hashedPassword,
                firstname: firstname,
                lastname: lastname
            }
        })
        
        let token = jwt.sign({id: newUser.id}, SECRET)


        return res.status(200).json({message: 'User created!', token})   

    } catch (error) {
        console.log(error)
        return res.status(500).json({error: error})
    }
}

module.exports.Login = async(req,res) => {
    const {email, password} = req.body;
       if(!email || !password){
            return res.status(400).json({message: 'Need all credentials!'})
        }
    try {
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if(!user){
            return res.status(403).json({message: 'Not found!'})
        }

        const matchPassword = await bcrypt.compare(password, user.password)
        if(!matchPassword){
            return res.status(403).json({message: "Password don't match!"})
        }

        let token = jwt.sign({id: user.id}, SECRET)
        return res.status(200).json({message: 'Login successful!', token})
    } catch (error) {
        console.log(error);

    }
}


