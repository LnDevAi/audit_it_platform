const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'general'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'permissions',
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['category']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  // Associations
  Permission.associate = (models) => {
    // Une permission peut être attribuée à plusieurs utilisateurs
    Permission.belongsToMany(models.User, {
      through: models.UserPermission,
      foreignKey: 'permission_id',
      otherKey: 'user_id',
      as: 'users'
    });
  };

  // Méthodes statiques
  Permission.getDefaultPermissions = function() {
    return [
      // Permissions de base
      { name: 'view', description: 'Consulter les données', category: 'read' },
      { name: 'edit', description: 'Modifier les données', category: 'write' },
      { name: 'delete', description: 'Supprimer les données', category: 'write' },
      
      // Permissions d'audit
      { name: 'scan', description: 'Lancer des scans', category: 'audit' },
      { name: 'export', description: 'Exporter des rapports', category: 'audit' },
      { name: 'import', description: 'Importer des données', category: 'audit' },
      
      // Permissions d'administration
      { name: 'admin', description: 'Administration complète', category: 'admin' },
      { name: 'user_management', description: 'Gestion des utilisateurs', category: 'admin' },
      { name: 'mission_management', description: 'Gestion des missions', category: 'admin' },
      { name: 'organization_management', description: 'Gestion de l\'organisation', category: 'admin' },
      
      // Permissions spécialisées
      { name: 'vulnerability_management', description: 'Gestion des vulnérabilités', category: 'security' },
      { name: 'network_management', description: 'Gestion du réseau', category: 'infrastructure' },
      { name: 'inventory_management', description: 'Gestion de l\'inventaire', category: 'infrastructure' },
      { name: 'report_generation', description: 'Génération de rapports', category: 'reporting' },
      { name: 'data_analysis', description: 'Analyse des données', category: 'analytics' }
    ];
  };

  Permission.initializeDefaultPermissions = async function() {
    const defaultPermissions = this.getDefaultPermissions();
    
    for (const permissionData of defaultPermissions) {
      await this.findOrCreate({
        where: { name: permissionData.name },
        defaults: permissionData
      });
    }
  };

  return Permission;
};