const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApiKey = sequelize.define('ApiKey', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Organizations',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  key_id: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [32, 32]
    }
  },
  key_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [64, 64]
    }
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    validate: {
      isArray(value) {
        if (!Array.isArray(value)) {
          throw new Error('Permissions must be an array');
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'revoked', 'expired'),
    allowNull: false,
    defaultValue: 'active'
  },
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  usage_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: true
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'api_keys',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['organization_id']
    },
    {
      fields: ['key_id'],
      unique: true
    },
    {
      fields: ['status']
    },
    {
      fields: ['expires_at']
    }
  ],
  hooks: {
    beforeUpdate: (apiKey) => {
      apiKey.updated_at = new Date();
    }
  }
});

// Relations
ApiKey.associate = (models) => {
  ApiKey.belongsTo(models.Organization, {
    foreignKey: 'organization_id',
    as: 'Organization'
  });
};

module.exports = ApiKey;
