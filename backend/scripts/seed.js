#!/usr/bin/env node

/* eslint-disable no-console */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize,
  Organization,
  User,
  AuditMission,
  AuditSite,
  InventoryItem,
  NetworkDevice,
  Vulnerability,
  Report,
  FileUpload,
  ServiceOffering,
  ServiceOrder,
  ServiceTask,
  Appointment,
  ServiceReport,
} = require('../models');

async function main() {
  try {
    console.log('➡️  Seeding database with realistic test data...');

    // Ensure schema
    await sequelize.sync({ alter: true });

    // Organization
    const org = await Organization.create({
      name: 'E-DEFENCE Test Org',
      slug: 'edefence-test',
      email: 'contact@edefence.local',
      subscription_plan: 'trial',
      subscription_status: 'active',
      max_users: 50,
      max_missions: 50,
      max_storage_gb: 50,
    });

    // Admin user
    const adminPassword = await bcrypt.hash('TestPassword123!', 12);
    const admin = await User.create({
      name: 'Admin Test',
      email: 'admin@edefence.local',
      password_hash: adminPassword,
      role: 'org_admin',
      organization_id: org.id,
      status: 'active',
    });

    // Mission
    const mission = await AuditMission.create({
      organization_id: org.id,
      name: 'Audit Sécurité IT - Démo',
      client_name: 'Client Démo',
      description: 'Mission de démonstration de bout en bout',
      status: 'in_progress',
      progress: 40,
      current_phase: 'fieldwork',
    });

    // Site
    const site = await AuditSite.create({
      mission_id: mission.id,
      name: 'Siège Ouaga',
      city: 'Ouagadougou',
      address: '123 Avenue de la Sécurité',
      site_type: 'headquarters',
      status: 'active',
    });

    // Assets
    await InventoryItem.bulkCreate([
      { site_id: site.id, category: 'server', brand: 'Dell', model: 'R740', location: 'DC-1', status: 'active' },
      { site_id: site.id, category: 'desktop', brand: 'HP', model: 'EliteDesk', location: 'Open Space', status: 'active' },
    ]);

    // Network devices
    const devices = await NetworkDevice.bulkCreate([
      { site_id: site.id, ip_address: '192.168.10.1', hostname: 'core-sw', device_type: 'switch', manufacturer: 'Cisco', status: 'active' },
      { site_id: site.id, ip_address: '192.168.10.10', hostname: 'app-srv', device_type: 'server', manufacturer: 'Dell', status: 'active' },
    ], { returning: true });

    // Vulnerabilities
    await Vulnerability.bulkCreate([
      { site_id: site.id, device_id: devices[1].id, vulnerability_id: 'CVE-2024-0001', title: 'OpenSSL outdated', severity: 'medium', category: 'system', port: 443, status: 'open' },
      { site_id: site.id, device_id: devices[0].id, vulnerability_id: 'CVE-2023-9999', title: 'SSH weak ciphers', severity: 'high', category: 'network', port: 22, status: 'open' },
    ]);

    // Report (metadata)
    await Report.create({
      mission_id: mission.id,
      type: 'final',
      title: 'Rapport Final - Démo',
      format: 'pdf',
      generated_by: admin.id,
    });

    // File upload (metadata)
    await FileUpload.create({
      mission_id: mission.id,
      original_name: 'inventory.csv',
      stored_name: 'inventory.csv',
      file_path: '/uploads/inventory.csv',
      file_size: 1024,
      category: 'document',
      uploaded_by: admin.id,
    });

    // Service offerings
    const offerings = await ServiceOffering.bulkCreate([
      { name: 'Pentest Externe', category: 'penetration_test', price_cents: 1500000 },
      { name: 'Hardening Serveur Linux', category: 'hardening', price_cents: 500000 },
      { name: 'Formation Sécurité', category: 'training', price_cents: 300000 },
    ], { returning: true });

    // Service order
    const order = await ServiceOrder.create({
      organization_id: org.id,
      offering_id: offerings[0].id,
      created_by: admin.id,
      status: 'in_progress',
      priority: 'high',
      requested_date: new Date(),
      details: { scope: '10 IPs externes', methodology: 'OWASP WSTG' }
    });

    await ServiceTask.bulkCreate([
      { service_order_id: order.id, title: 'Collecte d\'informations', status: 'done' },
      { service_order_id: order.id, title: 'Scan de ports', status: 'doing' },
      { service_order_id: order.id, title: 'Exploitation', status: 'todo' },
    ]);

    await Appointment.create({
      service_order_id: order.id,
      scheduled_at: new Date(Date.now() + 24 * 3600 * 1000),
      duration_minutes: 60,
      meeting_link: 'https://meet.example.com/abcdef',
    });

    await ServiceReport.create({
      service_order_id: order.id,
      title: 'Rapport Pentest Externe - Démo',
      format: 'pdf',
      generated_by: admin.id,
    });

    console.log('✅ Seed completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

main();

