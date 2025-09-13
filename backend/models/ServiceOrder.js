module.exports = (sequelize, DataTypes) => {
  const ServiceOrder = sequelize.define('ServiceOrder', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'organizations', key: 'id' }
    },
    offering_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'service_offerings', key: 'id' }
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    status: {
      type: DataTypes.ENUM('draft', 'requested', 'approved', 'in_progress', 'waiting_customer', 'completed', 'cancelled'),
      defaultValue: 'requested'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    requested_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    artifacts_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'service_orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['organization_id'] },
      { fields: ['offering_id'] },
      { fields: ['status'] },
      { fields: ['priority'] }
    ]
  });

  ServiceOrder.associate = (models) => {
    ServiceOrder.belongsTo(models.Organization, { foreignKey: 'organization_id', as: 'organization' });
    ServiceOrder.belongsTo(models.ServiceOffering, { foreignKey: 'offering_id', as: 'offering' });
    ServiceOrder.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    ServiceOrder.belongsTo(models.User, { foreignKey: 'assigned_to', as: 'assignee' });
    ServiceOrder.hasMany(models.ServiceTask, { foreignKey: 'service_order_id', as: 'tasks' });
    ServiceOrder.hasMany(models.Appointment, { foreignKey: 'service_order_id', as: 'appointments' });
    ServiceOrder.hasOne(models.ServiceReport, { foreignKey: 'service_order_id', as: 'report' });
  };

  return ServiceOrder;
};

