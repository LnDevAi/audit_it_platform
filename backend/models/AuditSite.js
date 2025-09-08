const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const AuditSite = sequelize.define('AuditSite', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'audit_missions',
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
    city: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    focal_point_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    focal_point_function: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    focal_point_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    focal_point_phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        is: /^[\+]?[0-9\s\-\(\)]{8,20}$/
      }
    },
    site_type: {
      type: DataTypes.ENUM('headquarters', 'branch', 'data_center', 'remote_office', 'other'),
      defaultValue: 'other',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'under_maintenance'),
      defaultValue: 'active',
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    coordinates: {
      type: DataTypes.JSON,
      allowNull: true
    },
    access_instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    security_level: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      allowNull: false
    }
  }, {
    tableName: 'audit_sites',
    timestamps: true,
    indexes: [
      {
        fields: ['mission_id']
      },
      {
        fields: ['name']
      },
      {
        fields: ['city']
      },
      {
        fields: ['site_type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['security_level']
      }
    ]
  });

  // Associations
  AuditSite.associate = (models) => {
    // Un site appartient à une mission
    AuditSite.belongsTo(models.AuditMission, {
      foreignKey: 'mission_id',
      as: 'mission'
    });
    
    // Un site a plusieurs éléments d'inventaire
    AuditSite.hasMany(models.InventoryItem, {
      foreignKey: 'site_id',
      as: 'inventoryItems'
    });
    
    // Un site a une infrastructure
    AuditSite.hasOne(models.Infrastructure, {
      foreignKey: 'site_id',
      as: 'infrastructure'
    });
    
    // Un site a plusieurs équipements réseau
    AuditSite.hasMany(models.NetworkDevice, {
      foreignKey: 'site_id',
      as: 'networkDevices'
    });
    
    // Un site a plusieurs vulnérabilités
    AuditSite.hasMany(models.Vulnerability, {
      foreignKey: 'site_id',
      as: 'vulnerabilities'
    });
    
    // Un site a des contrôles de sécurité
    AuditSite.hasOne(models.SecurityControl, {
      foreignKey: 'site_id',
      as: 'securityControls'
    });
    
    // Un site a plusieurs scans
    AuditSite.hasMany(models.Scan, {
      foreignKey: 'site_id',
      as: 'scans'
    });
  };

  // Méthodes d'instance
  AuditSite.prototype.isActive = function() {
    return this.status === 'active';
  };

  AuditSite.prototype.getFullAddress = function() {
    const parts = [this.address, this.city].filter(Boolean);
    return parts.join(', ');
  };

  AuditSite.prototype.getContactInfo = function() {
    return {
      name: this.focal_point_name,
      function: this.focal_point_function,
      email: this.focal_point_email,
      phone: this.focal_point_phone
    };
  };

  AuditSite.prototype.hasContactInfo = function() {
    return !!(this.focal_point_name || this.focal_point_email || this.focal_point_phone);
  };

  AuditSite.prototype.setCoordinates = async function(latitude, longitude) {
    this.coordinates = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };
    await this.save();
  };

  AuditSite.prototype.getCoordinates = function() {
    return this.coordinates || null;
  };

  AuditSite.prototype.getDistanceFrom = function(latitude, longitude) {
    if (!this.coordinates) return null;
    
    const R = 6371; // Rayon de la Terre en km
    const dLat = (latitude - this.coordinates.latitude) * Math.PI / 180;
    const dLon = (longitude - this.coordinates.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.coordinates.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return AuditSite;
};