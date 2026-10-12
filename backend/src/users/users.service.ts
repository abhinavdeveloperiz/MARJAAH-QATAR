import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

@Injectable()
export class UsersService {
  constructor(private readonly firestore: FirestoreService) {}

  async findAll() {
    const snap = await this.firestore.collection('users').get();
    return snap.docs.map(doc => {
      const data = doc.data();
      const { password, ...safeData } = data;
      return { id: doc.id, ...safeData };
    });
  }

  async findOne(id: string) {
    const doc = await this.firestore.doc('users', id).get();
    if (!doc.exists) {
      throw new NotFoundException(`User ${id} not found`);
    }
    const { password, ...safeData } = doc.data();
    return { id: doc.id, ...safeData };
  }

  async update(id: string, data: any) {
    const docRef = this.firestore.doc('users', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const { password, id: omittedId, ...updateData } = data;
    updateData.updated_at = new Date().toISOString();

    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    const { password: p, ...safeUser } = updatedDoc.data();
    return { id, ...safeUser };
  }

  // ── Addresses ──────────────────────────────────────
  async getAddresses(userId: string) {
    const snap = await this.firestore.collection('addresses')
      .where('user_id', '==', userId)
      .get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async addAddress(userId: string, data: any) {
    if (!data.full_name || !data.phone) {
      throw new BadRequestException('Full name and phone are required for address');
    }
    const address = {
      user_id: userId,
      label: data.label || 'Home',
      full_name: data.full_name,
      phone: data.phone,
      building: data.building || '',
      street: data.street || '',
      zone: data.zone || '',
      city: data.city || 'Doha',
      country: data.country || 'Qatar',
      is_default: Boolean(data.is_default),
      created_at: new Date().toISOString(),
    };
    const ref = await this.firestore.collection('addresses').add(address);
    return { id: ref.id, ...address };
  }

  async deleteAddress(userId: string, addressId: string) {
    const docRef = this.firestore.doc('addresses', addressId);
    const doc = await docRef.get();
    if (doc.exists && doc.data()?.user_id === userId) {
      await docRef.delete();
      return { success: true, message: 'Address deleted' };
    }
    throw new NotFoundException('Address not found or unauthorized');
  }
}
