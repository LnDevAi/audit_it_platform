const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Organization = sequelize.define('Organization', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isAlphanumeric: true,
        len: [2, 100]
      }
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        is: /^[\+]?[0-9\s\-\(\)]{8,20}$/
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    contact_person: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    subscription_plan: {
      type: DataTypes.ENUM('trial', 'basic', 'professional', 'enterprise'),
      defaultValue: 'trial',
      allowNull: false
    },
    subscription_status: {
      type: DataTypes.ENUM('active', 'suspended', 'cancelled', 'expired'),
      defaultValue: 'active',
      allowNull: false
    },
    subscription_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    subscription_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    max_users: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      allowNull: false,
      validate: {
        min: 1,
        max: 1000
      }
    },
    max_missions: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      allowNull: false,
      validate: {
        min: 1,
        max: 10000
      }
    },
    max_storage_gb: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      allowNull: false,
      validate: {
        min: 1,
        max: 1000
      }
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    billing_info: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active',
      allowNull: false
    }
  }, {
    tableName: 'organizations',
    timestamps: true,
    indexes: [
      {
        fields: ['slug']
      },
      {
        fields: ['subscription_plan', 'subscription_status']
      },
      {
        fields: ['status']
      },
      {
        fields: ['email']
      }
    ],
    hooks: {
      beforeCreate: (organization) => {
        // Générer un slug si non fourni
        if (!organization.slug) {
          organization.slug = organization.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        }
        
        // Configuration par défaut des features selon le plan
        if (!organization.features) {
          organization.features = getDefaultFeatures(organization.subscription_plan);
        }
        
        // Configuration par défaut des settings
        if (!organization.settings) {
          organization.settings = {
            timezone: 'Africa/Ouagadougou',
            currency: 'XOF',
            language: 'fr',
            date_format: 'DD/MM/YYYY'
          };
        }
      },
      
      beforeUpdate: (organization) => {
        // Mettre à jour les features si le plan change
        if (organization.changed('subscription_plan')) {
          organization.features = getDefaultFeatures(organization.subscription_plan);
        }
      }
    }
  });

  // Fonction pour obtenir les features par défaut selon le plan
  function getDefaultFeatures(plan) {
    const features = {
      trial: {
        audit_missions: true,
        inventory: true,
        basic_reports: true,
        email_support: true
      },
      basic: {
        audit_missions: true,
        inventory: true,
        network_scanning: true,
        vulnerability_scanning: true,
        basic_reports: true,
        email_support: true
      },
      professional: {
        audit_missions: true,
        inventory: true,
        network_scanning: true,
        vulnerability_scanning: true,
        advanced_reports: true,
        custom_templates: true,
        api_access: true,
        priority_support: true,
        data_import_export: true
      },
      enterprise: {
        audit_missions: true,
        inventory: true,
        network_scanning: true,
        vulnerability_scanning: true,
        advanced_reports: true,
        custom_templates: true,
        api_access: true,
        white_label: true,
        dedicated_support: true,
        data_import_export: true,
        compliance_templates: true,
        multi_site: true
      }
    };
    
    return features[plan] || features.trial;
  }

  // Associations
  Organization.associate = (models) => {
    // Une organisation a plusieurs utilisateurs
    Organization.hasMany(models.User, {
      foreignKey: 'organization_id',
      as: 'users'
    });
    
    // Une organisation a plusieurs missions
    Organization.hasMany(models.AuditMission, {
      foreignKey: 'organization_id',
      as: 'missions'
    });
    
    // Une organisation a plusieurs factures
    Organization.hasMany(models.Invoice, {
      foreignKey: 'organization_id',
      as: 'invoices'
    });
    
    // Une organisation a plusieurs imports
    Organization.hasMany(models.DataImport, {
      foreignKey: 'organization_id',
      as: 'imports'
    });
    
    // Une organisation a plusieurs exports
    Organization.hasMany(models.DataExport, {
      foreignKey: 'organization_id',
      as: 'exports'
    });
  };

  // Méthodes d'instance
  Organization.prototype.isSubscriptionActive = function() {
    if (this.subscription_status !== 'active') return false;
    if (!this.subscription_end_date) return true;
    return new Date() <= new Date(this.subscription_end_date);
  };

  Organization.prototype.canCreateUser = function() {
    if (!this.isSubscriptionActive()) return false;
    return this.users ? this.users.length < this.max_users : true;
  };

  Organization.prototype.canCreateMission = function() {
    if (!this.isSubscriptionActive()) return false;
    return this.missions ? this.missions.length < this.max_missions : true;
  };

  Organization.prototype.hasFeature = function(feature) {
    return this.features && this.features[feature] === true;
  };

  Organization.prototype.getStorageUsed = async function() {
    // Calculer l'espace de stockage utilisé
    const { DataImport, DataExport, FileUpload } = require('./index');
    
    const imports = await DataImport.sum('file_size', {
      where: { organization_id: this.id }
    }) || 0;
    
    const exports = await DataExport.sum('file_size', {
      where: { organization_id: this.id }
    }) || 0;
    
    const uploads = await FileUpload.sum('file_size', {
      where: { organization_id: this.id }
    }) || 0;
    
    return (imports + exports + uploads) / (1024 * 1024 * 1024); // Convertir en GB
  };

  Organization.prototype.getStorageAvailable = function() {
    return this.max_storage_gb;
  };

  Organization.prototype.getStorageUsagePercentage = async function() {
    const used = await this.getStorageUsed();
    return (used / this.max_storage_gb) * 100;
  };

  return Organization;
};