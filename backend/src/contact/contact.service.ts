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
}
