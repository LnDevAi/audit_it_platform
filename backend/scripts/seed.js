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
  SoftwareInstallation,
  ServerApplication,
  ServerMetric,
  BackupConfig,
  BackupEvent,
  AntivirusStatus,
  WifiAccessPoint,
  WifiSurvey,
  WifiSecurityIssue,
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
    const invItems = await InventoryItem.bulkCreate([
      { site_id: site.id, category: 'server', brand: 'Dell', model: 'R740', location: 'DC-1', status: 'active' },
      { site_id: site.id, category: 'desktop', brand: 'HP', model: 'EliteDesk', location: 'Open Space', status: 'active' },
    ], { returning: true });

    // Software installations
    await SoftwareInstallation.bulkCreate([
      { inventory_item_id: invItems[0].id, name: 'Ubuntu Server', version: '22.04 LTS', vendor: 'Canonical', critical: true },
      { inventory_item_id: invItems[0].id, name: 'Nginx', version: '1.24', vendor: 'F5 Nginx' },
      { inventory_item_id: invItems[1].id, name: 'Microsoft Office', version: '365', vendor: 'Microsoft' }
    ]);

    // Network devices
    const devices = await NetworkDevice.bulkCreate([
      { site_id: site.id, ip_address: '192.168.10.1', hostname: 'core-sw', device_type: 'switch', manufacturer: 'Cisco', status: 'active' },
      { site_id: site.id, ip_address: '192.168.10.10', hostname: 'app-srv', device_type: 'server', manufacturer: 'Dell', status: 'active' },
    ], { returning: true });

    // Server applications
    await ServerApplication.bulkCreate([
      { network_device_id: devices[1].id, name: 'Nginx', version: '1.24', port: 443, status: 'running' },
      { network_device_id: devices[1].id, name: 'PostgreSQL', version: '15', port: 5432, status: 'running' }
    ]);

    // Server metrics
    await ServerMetric.bulkCreate([
      { network_device_id: devices[1].id, cpu_percent: 35, mem_percent: 62, disk_percent: 70, load_1m: 0.8, load_5m: 0.7, load_15m: 0.6 },
      { network_device_id: devices[1].id, cpu_percent: 28, mem_percent: 60, disk_percent: 69, load_1m: 0.6, load_5m: 0.5, load_15m: 0.5 }
    ]);

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

    // Backup config & events
    await BackupConfig.create({ organization_id: org.id, strategy: 'mixed', schedule_cron: '0 2 * * *', retention_days: 30, offsite_enabled: true, tested_at: new Date(Date.now() - 20 * 24 * 3600 * 1000), last_success_at: new Date(), tooling: 'Veeam' });
    await BackupEvent.bulkCreate([
      { organization_id: org.id, type: 'backup', status: 'success', started_at: new Date(Date.now() - 2 * 24 * 3600 * 1000), finished_at: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 3600 * 1000), size_bytes: 50 * 1024 * 1024 * 1024, location: 'S3' },
      { organization_id: org.id, type: 'backup', status: 'success', started_at: new Date(Date.now() - 1 * 24 * 3600 * 1000), finished_at: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 3600 * 1000), size_bytes: 51 * 1024 * 1024 * 1024, location: 'S3' }
    ]);

    // Antivirus statuses
    await AntivirusStatus.bulkCreate([
      { inventory_item_id: invItems[0].id, vendor: 'ClamAV', product: 'ClamAV', version: '0.105', real_time_protection: true, defs_version: '2025-09-01', defs_date: new Date(Date.now() - 3 * 24 * 3600 * 1000), performance_impact: 'low' },
      { inventory_item_id: invItems[1].id, vendor: 'Windows Defender', product: 'Defender', version: '4.x', real_time_protection: true, defs_version: '1.1.23000', defs_date: new Date(Date.now() - 20 * 24 * 3600 * 1000), performance_impact: 'medium' }
    ]);

    // WiFi: APs, surveys, issues
    const aps = await WifiAccessPoint.bulkCreate([
      { site_id: site.id, ssid: 'ABI-Staff', band: '5GHz', channel: 44, encryption: 'WPA2-Enterprise', vendor: 'Cisco' },
      { site_id: site.id, ssid: 'ABI-Guest', band: '2.4GHz', channel: 6, encryption: 'WPA2', vendor: 'Cisco' }
    ], { returning: true });
    await WifiSurvey.bulkCreate([
      { ap_id: aps[0].id, rssi_dbm: -55, snr_db: 30, throughput_mbps: 120, packet_loss_percent: 0.2, jitter_ms: 4, location_hint: 'Open Space' },
      { ap_id: aps[1].id, rssi_dbm: -68, snr_db: 18, throughput_mbps: 12, packet_loss_percent: 3.1, jitter_ms: 12, location_hint: 'Accueil' }
    ]);
    await WifiSecurityIssue.bulkCreate([
      { ap_id: aps[1].id, type: 'weak_encryption', severity: 'medium', description: 'SSID invité en WPA2 PSK, envisager WPA3' }
    ]);

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

