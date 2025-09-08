const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const AuditMission = sequelize.define('AuditMission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organizations',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    client_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('planned', 'in_progress', 'review', 'completed', 'cancelled'),
      defaultValue: 'planned',
      allowNull: false
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    current_phase: {
      type: DataTypes.ENUM('planning', 'fieldwork', 'analysis', 'reporting', 'follow_up'),
      defaultValue: 'planning',
      allowNull: false
    },
    budget: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'XOF',
      allowNull: false
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      allowNull: false
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    objectives: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    deliverables: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    risks: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'audit_missions',
    timestamps: true,
    indexes: [
      {
        fields: ['organization_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['current_phase']
      },
      {
        fields: ['client_name']
      },
      {
        fields: ['start_date', 'end_date']
      },
      {
        fields: ['created_by']
      },
      {
        fields: ['assigned_to']
      },
      {
        fields: ['priority']
      }
    ],
    hooks: {
      beforeCreate: (mission) => {
        // Générer un nom unique si non fourni
        if (!mission.name) {
          mission.name = `Audit ${mission.client_name} ${new Date().getFullYear()}`;
        }
        
        // Validation des dates
        if (mission.start_date && mission.end_date) {
          if (new Date(mission.start_date) > new Date(mission.end_date)) {
            throw new Error('La date de début ne peut pas être postérieure à la date de fin');
          }
        }
      },
      
      beforeUpdate: (mission) => {
        // Validation des dates
        if (mission.changed('start_date') || mission.changed('end_date')) {
          if (mission.start_date && mission.end_date) {
            if (new Date(mission.start_date) > new Date(mission.end_date)) {
              throw new Error('La date de début ne peut pas être postérieure à la date de fin');
            }
          }
        }
        
        // Mise à jour automatique du statut selon la phase
        if (mission.changed('current_phase')) {
          switch (mission.current_phase) {
            case 'planning':
              mission.status = 'planned';
              mission.progress = 10;
              break;
            case 'fieldwork':
              mission.status = 'in_progress';
              mission.progress = 40;
              break;
            case 'analysis':
              mission.status = 'in_progress';
              mission.progress = 70;
              break;
            case 'reporting':
              mission.status = 'review';
              mission.progress = 90;
              break;
            case 'follow_up':
              mission.status = 'completed';
              mission.progress = 100;
              break;
          }
        }
      }
    }
  });

  // Associations
  AuditMission.associate = (models) => {
    // Une mission appartient à une organisation
    AuditMission.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    
    // Une mission est créée par un utilisateur
    AuditMission.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    
    // Une mission peut être assignée à un utilisateur
    AuditMission.belongsTo(models.User, {
      foreignKey: 'assigned_to',
      as: 'assignee'
    });
    
    // Une mission a plusieurs sites
    AuditMission.hasMany(models.AuditSite, {
      foreignKey: 'mission_id',
      as: 'sites'
    });
    
    // Une mission a plusieurs entretiens
    AuditMission.hasMany(models.Interview, {
      foreignKey: 'mission_id',
      as: 'interviews'
    });
    
    // Une mission a plusieurs rapports
    AuditMission.hasMany(models.Report, {
      foreignKey: 'mission_id',
      as: 'reports'
    });
    
    // Une mission a plusieurs fichiers uploadés
    AuditMission.hasMany(models.FileUpload, {
      foreignKey: 'mission_id',
      as: 'files'
    });
  };

  // Méthodes d'instance
  AuditMission.prototype.isActive = function() {
    return ['planned', 'in_progress', 'review'].includes(this.status);
  };

  AuditMission.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  AuditMission.prototype.isCancelled = function() {
    return this.status === 'cancelled';
  };

  AuditMission.prototype.getDuration = function() {
    if (!this.start_date || !this.end_date) return null;
    const start = new Date(this.start_date);
    const end = new Date(this.end_date);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // en jours
  };

  AuditMission.prototype.getDaysRemaining = function() {
    if (!this.end_date) return null;
    const end = new Date(this.end_date);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  AuditMission.prototype.isOverdue = function() {
    if (!this.end_date) return false;
    return new Date() > new Date(this.end_date) && !this.isCompleted();
  };

  AuditMission.prototype.updateProgress = async function(progress) {
    this.progress = Math.max(0, Math.min(100, progress));
    
    // Mise à jour automatique du statut selon le progrès
    if (this.progress === 0) {
      this.status = 'planned';
      this.current_phase = 'planning';
    } else if (this.progress < 40) {
      this.status = 'in_progress';
      this.current_phase = 'fieldwork';
    } else if (this.progress < 70) {
      this.status = 'in_progress';
      this.current_phase = 'analysis';
    } else if (this.progress < 100) {
      this.status = 'review';
      this.current_phase = 'reporting';
    } else {
      this.status = 'completed';
      this.current_phase = 'follow_up';
    }
    
    await this.save();
  };

  AuditMission.prototype.addTag = async function(tag) {
    if (!this.tags) this.tags = [];
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      await this.save();
    }
  };

  AuditMission.prototype.removeTag = async function(tag) {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
      await this.save();
    }
  };

  AuditMission.prototype.addObjective = async function(objective) {
    if (!this.objectives) this.objectives = [];
    this.objectives.push({
      id: Date.now(),
      text: objective,
      completed: false,
      created_at: new Date()
    });
    await this.save();
  };

  AuditMission.prototype.completeObjective = async function(objectiveId) {
    if (this.objectives) {
      const objective = this.objectives.find(obj => obj.id === objectiveId);
      if (objective) {
        objective.completed = true;
        objective.completed_at = new Date();
        await this.save();
      }
    }
  };

  AuditMission.prototype.addDeliverable = async function(deliverable) {
    if (!this.deliverables) this.deliverables = [];
    this.deliverables.push({
      id: Date.now(),
      name: deliverable.name,
      description: deliverable.description,
      due_date: deliverable.due_date,
      status: 'pending',
      created_at: new Date()
    });
    await this.save();
  };

  AuditMission.prototype.updateDeliverableStatus = async function(deliverableId, status) {
    if (this.deliverables) {
      const deliverable = this.deliverables.find(del => del.id === deliverableId);
      if (deliverable) {
        deliverable.status = status;
        deliverable.updated_at = new Date();
        await this.save();
      }
    }
  };

  AuditMission.prototype.addRisk = async function(risk) {
    if (!this.risks) this.risks = [];
    this.risks.push({
      id: Date.now(),
      description: risk.description,
      impact: risk.impact,
      probability: risk.probability,
      mitigation: risk.mitigation,
      status: 'open',
      created_at: new Date()
    });
    await this.save();
  };

  AuditMission.prototype.updateRiskStatus = async function(riskId, status) {
    if (this.risks) {
      const risk = this.risks.find(r => r.id === riskId);
      if (risk) {
        risk.status = status;
        risk.updated_at = new Date();
        await this.save();
      }
    }
  };

  return AuditMission;
};