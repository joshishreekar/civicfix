import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {z} from 'zod';
import {query} from '../db.js';
const r=express.Router();
const reg=z.object({name:z.string().min(2).max(150),email:z.string().email(),phone:z.string().min(7).max(30),password:z.string().min(8),confirmPassword:z.string()}).refine(x=>x.password===x.confirmPassword,{path:['confirmPassword'],message:'Passwords do not match'});

r.post('/citizen/register',async(req,res,next)=>{
 try{
  const x=reg.parse(req.body); const exists=await query('SELECT 1 FROM users WHERE email=$1',[x.email]);
  if(exists.rowCount)return res.status(409).json({message:'Email already registered'});
  const hash=await bcrypt.hash(x.password,12);
  const q=await query(`INSERT INTO users(role,name,email,phone,password_hash) VALUES('CITIZEN',$1,$2,$3,$4) RETURNING id,role,name,email,phone`,[x.name,x.email,x.phone,hash]);
  res.status(201).json({user:q.rows[0]});
 }catch(e){next(e)}
});
r.post('/login',async(req,res,next)=>{
 try{
  const {email,password,loginType}=req.body;
  let q=loginType==='DEPARTMENT'
   ? await query('SELECT id,name,email,phone,password_hash,code FROM departments WHERE email=$1 AND active=true',[email])
   : await query('SELECT id,name,email,phone,password_hash FROM users WHERE email=$1 AND role=$2',[email,'CITIZEN']);
  if(!q.rowCount || !(await bcrypt.compare(password,q.rows[0].password_hash)))return res.status(401).json({message:'Invalid credentials'});
  const row=q.rows[0], role=loginType==='DEPARTMENT'?'DEPARTMENT':'CITIZEN';
  const token=jwt.sign({id:row.id,role,name:row.name,email:row.email,departmentCode:row.code},process.env.JWT_SECRET,{expiresIn:'8h'});
  delete row.password_hash; res.json({token,user:{...row,role}});
 }catch(e){next(e)}
});
export default r;
