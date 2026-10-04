import express from 'express';
import {query} from '../db.js';
import {auth,role} from '../middleware/auth.js';
const r=express.Router();
r.get('/complaints',auth,role('DEPARTMENT'),async(req,res,next)=>{
 try{
  const {status,priority,category,search}=req.query;
  const vals=[req.user.id]; let where='c.department_id=$1'; let n=2;
  if(status){where+=` AND c.status=$${n++}`;vals.push(status)}
  if(priority){where+=` AND c.final_priority=$${n++}`;vals.push(priority)}
  if(category){where+=` AND cat.name=$${n++}`;vals.push(category)}
  if(search){where+=` AND (c.public_id ILIKE $${n} OR c.description ILIKE $${n})`;vals.push(`%${search}%`);n++}
  const q=await query(`SELECT c.*,cat.name category,u.name citizen_name FROM complaints c LEFT JOIN categories cat ON cat.id=c.category_id JOIN users u ON u.id=c.citizen_id WHERE ${where} ORDER BY c.created_at DESC`,vals);res.json(q.rows)
 }catch(e){next(e)}
});
r.get('/stats',auth,role('DEPARTMENT'),async(req,res,next)=>{try{const q=await query(`SELECT count(*) total,count(*) FILTER(WHERE status='Reported') new,count(*) FILTER(WHERE status='In Progress') in_progress,count(*) FILTER(WHERE status='Resolved') resolved,count(*) FILTER(WHERE final_priority='High') high,count(*) FILTER(WHERE final_priority='Critical') critical FROM complaints WHERE department_id=$1`,[req.user.id]);res.json(q.rows[0])}catch(e){next(e)}});
export default r;
