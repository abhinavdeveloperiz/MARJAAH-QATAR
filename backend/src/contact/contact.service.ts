import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

@Injectable()
export class ContactService {
  constructor(private readonly firestore: FirestoreService) {}

  async submitMessage(data: { name: string; email: string; phone?: string; subject: string; message: string }) {
    if (!data.name || !data.email || !data.subject || !data.message) {
      throw new BadRequestException('Name, email, subject, and message are required');
    }
    const record = {
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      subject: data.subject,
      message: data.message,
      status: 'new',
      created_at: new Date().toISOString(),
    };
    const ref = await this.firestore.collection('contact_messages').add(record);
    return {
      success: true,
      message: 'Your message has been received. Our team will contact you shortly.',
      id: ref.id,
    };
  }

  async findAll() {
    const snap = await this.firestore.collection('contact_messages').get();
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return list;
  }

  async updateStatus(id: string, status: string) {
    const docRef = this.firestore.doc('contact_messages', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Message ${id} not found`);
    }
    await docRef.update({
      status,
      updated_at: new Date().toISOString(),
    });
    return { success: true, id, status };
  }

  async findOne(id: string) {
    const docRef = this.firestore.doc('contact_messages', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Message ${id} not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async replyMessage(id: string, reply: string) {
    if (!reply || !reply.trim()) {
      throw new BadRequestException('Reply text is required');
    }
    const docRef = this.firestore.doc('contact_messages', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Message ${id} not found`);
    }
    await docRef.update({
      reply: reply.trim(),
      replied_at: new Date().toISOString(),
      status: 'replied',
      updated_at: new Date().toISOString(),
    });
    return { success: true, id, reply: reply.trim(), status: 'replied' };
  }

  async deleteMessage(id: string) {
    const docRef = this.firestore.doc('contact_messages', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Message ${id} not found`);
    }
    await docRef.delete();
    return { success: true, message: `Message ${id} deleted successfully` };
  }

  async getStats() {
    const snap = await this.firestore.collection('contact_messages').get();
    const list = snap.docs.map(doc => doc.data() as any);
    const total = list.length;
    const newCount = list.filter(m => m.status === 'new').length;
    const readCount = list.filter(m => m.status === 'read').length;
    const repliedCount = list.filter(m => m.status === 'replied').length;
    const archivedCount = list.filter(m => m.status === 'archived').length;

    return {
      total,
      new: newCount,
      read: readCount,
      replied: repliedCount,
      archived: archivedCount,
    };
  }
}
