module.exports = (sequelize, DataTypes) => {
  const ServiceTask = sequelize.define('ServiceTask', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    service_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'service_orders', key: 'id' }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('todo', 'doing', 'blocked', 'done'),
      defaultValue: 'todo'
    },
    assignee_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    checklist: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'service_tasks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['service_order_id'] },
      { fields: ['status'] }
    ]
  });

  ServiceTask.associate = (models) => {
    ServiceTask.belongsTo(models.ServiceOrder, { foreignKey: 'service_order_id', as: 'order' });
    ServiceTask.belongsTo(models.User, { foreignKey: 'assignee_user_id', as: 'assignee' });
  };

  return ServiceTask;
};

