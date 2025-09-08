const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'org_admin', 'auditor_senior', 'auditor_junior', 'client', 'viewer'),
      defaultValue: 'viewer',
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        is: /^[\+]?[0-9\s\-\(\)]{8,20}$/
      }
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active',
      allowNull: false
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    email_verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    two_factor_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    two_factor_secret: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        fields: ['organization_id']
      },
      {
        fields: ['email']
      },
      {
        fields: ['role']
      },
      {
        fields: ['status']
      },
      {
        unique: true,
        fields: ['email', 'organization_id']
      }
    ],
    hooks: {
      beforeCreate: async (user) => {
        // Hasher le mot de passe si fourni
        if (user.password_hash && !user.password_hash.startsWith('$2b$')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 12);
        }
        
        // Configuration par défaut des préférences
        if (!user.preferences) {
          user.preferences = {
            theme: 'light',
            language: 'fr',
            notifications: {
              email: true,
              push: false
            },
            dashboard: {
              default_view: 'missions',
              items_per_page: 10
            }
          };
        }
      },
      
      beforeUpdate: async (user) => {
        // Hasher le mot de passe si modifié
        if (user.changed('password_hash') && !user.password_hash.startsWith('$2b$')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 12);
        }
      }
    }
  });

  // Associations
  User.associate = (models) => {
    // Un utilisateur appartient à une organisation
    User.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    
    // Un utilisateur a plusieurs permissions
    User.belongsToMany(models.Permission, {
      through: models.UserPermission,
      foreignKey: 'user_id',
      otherKey: 'permission_id',
      as: 'permissions'
    });
    
    // Un utilisateur peut créer plusieurs missions
    User.hasMany(models.AuditMission, {
      foreignKey: 'created_by',
      as: 'createdMissions'
    });
    
    // Un utilisateur peut effectuer plusieurs entretiens
    User.hasMany(models.Interview, {
      foreignKey: 'conducted_by',
      as: 'conductedInterviews'
    });
    
    // Un utilisateur peut générer plusieurs rapports
    User.hasMany(models.Report, {
      foreignKey: 'generated_by',
      as: 'generatedReports'
    });
    
    // Un utilisateur peut effectuer plusieurs scans
    User.hasMany(models.Scan, {
      foreignKey: 'performed_by',
      as: 'performedScans'
    });
    
    // Un utilisateur a plusieurs logs d'activité
    User.hasMany(models.ActivityLog, {
      foreignKey: 'user_id',
      as: 'activityLogs'
    });
    
    // Un utilisateur peut uploader plusieurs fichiers
    User.hasMany(models.FileUpload, {
      foreignKey: 'uploaded_by',
      as: 'uploadedFiles'
    });
    
    // Un utilisateur peut effectuer plusieurs imports
    User.hasMany(models.DataImport, {
      foreignKey: 'user_id',
      as: 'imports'
    });
    
    // Un utilisateur peut effectuer plusieurs exports
    User.hasMany(models.DataExport, {
      foreignKey: 'user_id',
      as: 'exports'
    });
  };

  // Méthodes d'instance
  User.prototype.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.password_hash);
  };

  User.prototype.updateLastLogin = async function() {
    this.last_login = new Date();
    await this.save();
  };

  User.prototype.isActive = function() {
    return this.status === 'active';
  };

  User.prototype.isSuperAdmin = function() {
    return this.role === 'super_admin';
  };

  User.prototype.isOrgAdmin = function() {
    return this.role === 'org_admin';
  };

  User.prototype.isAuditor = function() {
    return ['auditor_senior', 'auditor_junior'].includes(this.role);
  };

  User.prototype.canManageUsers = function() {
    return ['super_admin', 'org_admin'].includes(this.role);
  };

  User.prototype.canManageMissions = function() {
    return ['super_admin', 'org_admin', 'auditor_senior'].includes(this.role);
  };

  User.prototype.canPerformScans = function() {
    return ['super_admin', 'org_admin', 'auditor_senior', 'auditor_junior'].includes(this.role);
  };

  User.prototype.canExportData = function() {
    return ['super_admin', 'org_admin', 'auditor_senior'].includes(this.role);
  };

  User.prototype.hasPermission = function(permissionName) {
    if (!this.permissions) return false;
    return this.permissions.some(permission => permission.name === permissionName);
  };

  User.prototype.getDisplayName = function() {
    return this.name || this.email;
  };

  User.prototype.getInitials = function() {
    const names = this.name.split(' ');
    return names.map(name => name.charAt(0).toUpperCase()).join('').substring(0, 2);
  };

  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password_hash;
    delete values.email_verification_token;
    delete values.password_reset_token;
    delete values.two_factor_secret;
    return values;
  };

  // Méthodes statiques
  User.findByEmail = async function(email, organizationId = null) {
    const where = { email };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    
    return await this.findOne({
      where,
      include: [
        {
          model: sequelize.models.Organization,
          as: 'organization'
        },
        {
          model: sequelize.models.Permission,
          as: 'permissions',
          through: { attributes: [] }
        }
      ]
    });
  };

  User.findActiveByEmail = async function(email, organizationId = null) {
    const where = { email, status: 'active' };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    
    return await this.findOne({
      where,
      include: [
        {
          model: sequelize.models.Organization,
          as: 'organization'
        },
        {
          model: sequelize.models.Permission,
          as: 'permissions',
          through: { attributes: [] }
        }
      ]
    });
  };

  return User;
};