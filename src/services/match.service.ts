import { Match } from '../models/Match';

export class MatchService {
    static async createRequest(requesterId: number, targetId: number, type: string = 'NORMAL') {
        try {
            const reqId = Number(requesterId);
            const tgtId = Number(targetId);

            const matched = await Match.findOneAndUpdate(
                { requesterId: tgtId, targetId: reqId, status: 'PENDING' },
                { $set: { status: 'MATCHED' } },
                { new: true }
            );

            if (matched) return { success: true, status: 'MATCHED' };

            const pending = await Match.findOne({ requesterId: reqId, targetId: tgtId });
            if (pending) return { success: false, error: 'Request already pending or matched!' };

            await Match.create({ requesterId: reqId, targetId: tgtId, status: 'PENDING', type });
            return { success: true, status: 'PENDING' };

        } catch (error) {
            console.error(error);
            return { success: false, error: 'Database error' };
        }
    }
}