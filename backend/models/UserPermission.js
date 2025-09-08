const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const UserPermission = sequelize.define('UserPermission', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    permission_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'permissions',
        key: 'id'
      }
    },
    granted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    granted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'user_permissions',
    timestamps: false,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['permission_id']
      },
      {
        fields: ['granted_by']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  // Associations
  UserPermission.associate = (models) => {
    // Une permission utilisateur appartient à un utilisateur
    UserPermission.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    // Une permission utilisateur appartient à une permission
    UserPermission.belongsTo(models.Permission, {
      foreignKey: 'permission_id',
      as: 'permission'
    });
    
    // Une permission utilisateur peut être accordée par un utilisateur
    UserPermission.belongsTo(models.User, {
      foreignKey: 'granted_by',
      as: 'grantedBy'
    });
  };

  // Méthodes d'instance
  UserPermission.prototype.isExpired = function() {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  };

  UserPermission.prototype.isValid = function() {
    return this.is_active && !this.isExpired();
  };

  return UserPermission;
};
