import { db } from '../lib/db.js';

// GET all participants (with search and pagination)
export const getParticipants = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {
            userId: req.user.id, // Scoped to current user
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        const [participants, total] = await Promise.all([
            db.participant.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { participations: true }
                    }
                }
            }),
            db.participant.count({ where })
        ]);

        res.json({
            success: true,
            data: participants,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get Participants Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET single participant
export const getParticipant = async (req, res) => {
    try {
        const { id } = req.params;
        const participant = await db.participant.findUnique({
            where: {
                id: parseInt(id),
                userId: req.user.id
            },
            include: {
                participations: {
                    include: { event: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!participant) {
            return res.status(404).json({ success: false, message: 'Participant not found' });
        }

        res.json({ success: true, data: participant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST create participant
export const createParticipant = async (req, res) => {
    try {
        const { name, email, phone, organization, department, jobTitle, customData } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and Email are required' });
        }

        // Check duplicate
        const existing = await db.participant.findUnique({
            where: {
                userId_email: {
                    userId: req.user.id,
                    email: email
                }
            }
        });

        if (existing) {
            return res.status(409).json({ success: false, message: 'Participant with this email already exists' });
        }

        const randomSuffix = Math.random().toString(36).substring(2, 9);
        const pId = `PART-${Date.now()}-${randomSuffix}`;

        const participant = await db.participant.create({
            data: {
                userId: req.user.id,
                participantId: pId,
                name,
                email,
                phone,
                organization,
                department,
                jobTitle,
                customData: customData ? JSON.stringify(customData) : null
            }
        });

        res.status(201).json({ success: true, data: participant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT update participant
export const updateParticipant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, organization, department, jobTitle, customData } = req.body;

        const participant = await db.participant.findUnique({
            where: { id: parseInt(id), userId: req.user.id } // Authorization: Scoped to current user
        });

        if (!participant) {
            return res.status(404).json({ success: false, message: 'Participant not found' });
        }

        const updated = await db.participant.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email, // Ensure email uniqueness logic handled by DB constraint
                phone,
                organization,
                department,
                jobTitle,
                customData: customData ? JSON.stringify(customData) : undefined
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        if (error.code === 'P2002') { // Prisma unique constraint violation
            return res.status(409).json({ success: false, message: 'Email already exists for another participant' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE participant
export const deleteParticipant = async (req, res) => {
    try {
        const { id } = req.params;

        const participant = await db.participant.findUnique({
            where: { id: parseInt(id), userId: req.user.id } // Authorization: Scoped to current user
        });

        if (!participant) {
            return res.status(404).json({ success: false, message: 'Participant not found' });
        }

        await db.participant.delete({
            where: { id: parseInt(id) }
        });

        res.json({ success: true, message: 'Participant deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
