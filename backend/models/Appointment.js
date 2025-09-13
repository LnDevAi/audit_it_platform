module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define('Appointment', {
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
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    meeting_link: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'),
      defaultValue: 'scheduled'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'appointments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['service_order_id'] },
      { fields: ['scheduled_at'] }
    ]
  });

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.ServiceOrder, { foreignKey: 'service_order_id', as: 'order' });
  };

  return Appointment;
};

