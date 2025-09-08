const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    slug: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        isAlphanumeric: true,
        isLowercase: true
      }
    },
    description: {
      type: DataTypes.TEXT
    },
    price_monthly: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    price_yearly: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    max_users: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    max_missions: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    max_storage_gb: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    features: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'subscription_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return SubscriptionPlan;
};
