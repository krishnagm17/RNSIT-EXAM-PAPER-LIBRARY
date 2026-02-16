import express from 'express';
import { User } from '../models/User.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'ADMIN' } }).sort({ createdAt: -1 });
    res.json(
      users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt
      }))
    );
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

export default router;

