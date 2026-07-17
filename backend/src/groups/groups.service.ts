import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SqliteService } from '../config/sqlite.service';
import { FirestoreService } from '../config/firestore.service';
import { usesFirebase } from '../config/storage.util';
import { CreateGroupDto, UpdateGroupDto } from '../dto/create-group.dto';
import { Group } from './group.interface';
import { Member } from '../members/member.interface';

@Injectable()
export class GroupsService {
  constructor(private readonly sqliteService: SqliteService, private readonly firestoreService: FirestoreService, private readonly configService: ConfigService) {}
  private getPreferredStorage(): 'sqlite' { return 'sqlite'; }
  private usesFirebase(): boolean { return usesFirebase(this.configService, this.firestoreService); }
  async findAll(): Promise<any[]> {
    if (this.usesFirebase()) {
      const [groups, members] = await Promise.all([this.firestoreService.collection('groups').get(), this.firestoreService.collection('groupMembers').get()]);
      return groups.docs.map(doc => ({ ...this.firestoreService.docToData<any>(doc), memberCount: members.docs.filter(member => member.data().groupId === doc.id).length }));
    }
    if (!this.sqliteService.isReady()) return [];
    const db = this.sqliteService.getDatabase();
    return (db.prepare('SELECT * FROM groups ORDER BY name').all() as any[]).map(group => ({ ...group, permissions: this.permissions(group.permissions), memberCount: (db.prepare('SELECT COUNT(*) count FROM group_members WHERE group_id = ?').get(group.id) as any).count }));
  }
  async findOne(id: any): Promise<Group> {
    if (this.usesFirebase()) {
      const doc = await this.firestoreService.collection('groups').doc(String(id)).get();
      if (!doc.exists) throw new NotFoundException(`Group with ID "${id}" not found`);
      const members = await this.firestoreService.collection('groupMembers').where('groupId', '==', String(id)).get();
      return { ...(this.firestoreService.docToData<any>(doc)), members: members.docs.map(m => ({ id: m.id, ...m.data() })) } as Group;
    }
    const group = this.sqliteService.getDatabase().prepare('SELECT * FROM groups WHERE id = ?').get(id) as any;
    if (!group) throw new NotFoundException(`Group with ID "${id}" not found`);
    return { ...group, permissions: this.permissions(group.permissions), members: this.sqliteService.getDatabase().prepare('SELECT * FROM group_members WHERE group_id = ?').all(id) } as Group;
  }
  async create(dto: CreateGroupDto): Promise<Group> {
    if (this.usesFirebase()) {
      const id = randomUUID(), now = new Date();
      await this.firestoreService.collection('groups').doc(id).set({ ...dto, description: dto.description ?? '', permissions: dto.permissions ?? [], createdBy: '', createdAt: now, updatedAt: now });
      return this.findOne(id);
    }
    const db = this.sqliteService.getDatabase(), id = Date.now();
    try { db.prepare('INSERT INTO groups (id, name, description, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, dto.name, dto.description ?? '', JSON.stringify(dto.permissions ?? []), new Date().toISOString(), new Date().toISOString()); }
    catch (error: any) { if (error.message.includes('UNIQUE')) throw new ConflictException(`Group with name "${dto.name}" already exists`); throw error; }
    return this.findOne(id);
  }
  async update(id: any, dto: UpdateGroupDto): Promise<Group> {
    if (this.usesFirebase()) { const ref = this.firestoreService.collection('groups').doc(String(id)); if (!(await ref.get()).exists) throw new NotFoundException(`Group with ID "${id}" not found`); await ref.update({ ...dto, updatedAt: new Date() }); return this.findOne(id); }
    const db = this.sqliteService.getDatabase(), fields = Object.entries(dto).filter(([, v]) => v !== undefined);
    if (!fields.length) return this.findOne(id);
    try { db.prepare(`UPDATE groups SET ${fields.map(([k]) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(...fields.map(([k, v]) => k === 'permissions' ? JSON.stringify(v) : v), new Date().toISOString(), id); return this.findOne(id); }
    catch (error: any) { if (error.message.includes('UNIQUE')) throw new ConflictException(`Group with name "${dto.name}" already exists`); throw new NotFoundException(`Group with ID "${id}" not found`); }
  }
  async remove(id: any): Promise<void> { if (this.usesFirebase()) { await this.firestoreService.collection('groups').doc(String(id)).delete(); return; } if (!this.sqliteService.getDatabase().prepare('DELETE FROM groups WHERE id = ?').run(id).changes) throw new NotFoundException(`Group with ID "${id}" not found`); }
  async addMember(groupId: any, memberId: string): Promise<void> {
    if (this.usesFirebase()) { const existing = await this.firestoreService.collection('groupMembers').where('groupId', '==', String(groupId)).where('memberId', '==', memberId).limit(1).get(); if (!existing.empty) throw new ConflictException('Member is already a member of this group'); await this.firestoreService.collection('groupMembers').doc(randomUUID()).set({ groupId: String(groupId), memberId, role: 'member', joinedAt: new Date() }); return; }
    try { this.sqliteService.getDatabase().prepare('INSERT INTO group_members (group_id, member_id) VALUES (?, ?)').run(groupId, memberId); } catch (error: any) { if (error.message.includes('UNIQUE')) throw new ConflictException('Member is already a member of this group'); throw error; }
  }
  async removeMember(groupId: any, memberId: string): Promise<void> { if (this.usesFirebase()) { const snapshot = await this.firestoreService.collection('groupMembers').where('groupId', '==', String(groupId)).where('memberId', '==', memberId).get(); await Promise.all(snapshot.docs.map(doc => doc.ref.delete())); return; } this.sqliteService.getDatabase().prepare('DELETE FROM group_members WHERE group_id = ? AND member_id = ?').run(groupId, memberId); }
  async getMembers(groupId: any): Promise<Member[]> { if (this.usesFirebase()) return []; const db = this.sqliteService.getDatabase(); return db.prepare('SELECT u.* FROM users u INNER JOIN group_members gm ON u.id = gm.member_id WHERE gm.group_id = ?').all(groupId) as Member[]; }
  private permissions(value: unknown): string[] { try { return typeof value === 'string' ? JSON.parse(value) : Array.isArray(value) ? value : []; } catch { return []; } }
}
