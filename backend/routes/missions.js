const express = require('express');
const { AuditMission, AuditSite, User, Interview, Report } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const router = express.Router();

// Get all missions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const missions = await AuditMission.findAll({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: AuditSite,
          as: 'sites'
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(missions);
  } catch (error) {
    console.error('Get missions error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des missions' });
  }
});

// Get mission by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const mission = await AuditMission.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: AuditSite,
          as: 'sites'
        },
        {
          model: Interview,
          as: 'interviews',
          include: [{
            model: User,
            as: 'conductor',
            attributes: ['id', 'name']
          }]
        },
        {
          model: Report,
          as: 'reports',
          include: [{
            model: User,
            as: 'generator',
            attributes: ['id', 'name']
          }]
        }
      ]
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission non trouvée' });
    }

    res.json(mission);
  } catch (error) {
    console.error('Get mission error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la mission' });
  }
});

// Create new mission
router.post('/', authenticateToken, requirePermission('mission_management'), async (req, res) => {
  try {
    const {
      name,
      client_name,
      description,
      start_date,
      end_date
    } = req.body;

    if (!name || !client_name || !start_date || !end_date) {
      return res.status(400).json({
        error: 'Nom, client, date de début et date de fin requis'
      });
    }

    const mission = await AuditMission.create({
      name,
      client_name,
      description,
      start_date,
      end_date,
      created_by: req.user.id
    });

    const missionWithCreator = await AuditMission.findByPk(mission.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.status(201).json(missionWithCreator);
  } catch (error) {
    console.error('Create mission error:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la mission' });
  }
});

// Update mission
router.put('/:id', authenticateToken, requirePermission('mission_management'), async (req, res) => {
  try {
    const mission = await AuditMission.findByPk(req.params.id);

    if (!mission) {
      return res.status(404).json({ error: 'Mission non trouvée' });
    }

    const {
      name,
      client_name,
      description,
      start_date,
      end_date,
      status,
      progress_percentage,
      current_phase
    } = req.body;

    await mission.update({
      name: name || mission.name,
      client_name: client_name || mission.client_name,
      description: description !== undefined ? description : mission.description,
      start_date: start_date || mission.start_date,
      end_date: end_date || mission.end_date,
      status: status || mission.status,
      progress_percentage: progress_percentage !== undefined ? progress_percentage : mission.progress_percentage,
      current_phase: current_phase || mission.current_phase
    });

    const updatedMission = await AuditMission.findByPk(mission.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.json(updatedMission);
  } catch (error) {
    console.error('Update mission error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la mission' });
  }
});

// Delete mission
router.delete('/:id', authenticateToken, requirePermission('mission_management'), async (req, res) => {
  try {
    const mission = await AuditMission.findByPk(req.params.id);

    if (!mission) {
      return res.status(404).json({ error: 'Mission non trouvée' });
    }

    await mission.destroy();
    res.json({ message: 'Mission supprimée avec succès' });
  } catch (error) {
    console.error('Delete mission error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la mission' });
  }
});

// Get mission dashboard stats
router.get('/:id/dashboard', authenticateToken, async (req, res) => {
  try {
    const mission = await AuditMission.findByPk(req.params.id, {
      include: [
        {
          model: AuditSite,
          as: 'sites',
          include: [
            'inventory',
            'networkDevices',
            'vulnerabilities'
          ]
        },
        {
          model: Interview,
          as: 'interviews'
        }
      ]
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission non trouvée' });
    }

    let totalDevices = 0;
    let totalNetworkDevices = 0;
    let totalVulnerabilities = 0;

    mission.sites.forEach(site => {
      totalDevices += site.inventory?.length || 0;
      totalNetworkDevices += site.networkDevices?.length || 0;
      totalVulnerabilities += site.vulnerabilities?.length || 0;
    });

    const completedInterviews = mission.interviews.filter(i => i.status === 'completed').length;
    const totalInterviews = mission.interviews.length;

    const stats = {
      totalDevices,
      totalNetworkDevices,
      totalVulnerabilities,
      completedInterviews,
      totalInterviews,
      progressPercentage: mission.progress_percentage,
      currentPhase: mission.current_phase,
      status: mission.status
    };

    res.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

module.exports = router;
