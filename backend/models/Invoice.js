const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
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
    invoice_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'XOF'
    },
    service_order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'service_orders',
        key: 'id'
      }
    },
    payment_reference: {
      type: DataTypes.STRING(128),
      allowNull: true,
      unique: false
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    customer_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled'),
      defaultValue: 'draft'
    },
    due_date: {
      type: DataTypes.DATEONLY
    },
    paid_date: {
      type: DataTypes.DATEONLY
    },
    billing_period_start: {
      type: DataTypes.DATEONLY
    },
    billing_period_end: {
      type: DataTypes.DATEONLY
    },
    items: {
      type: DataTypes.JSON
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'invoices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['organization_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['due_date']
      }
    ]
  });

  // Méthodes d'instance
  Invoice.prototype.isOverdue = function() {
    return this.status !== 'paid' && this.due_date && new Date() > new Date(this.due_date);
  };

  Invoice.prototype.markAsPaid = function() {
    this.status = 'paid';
    this.paid_date = new Date();
    return this.save();
  };

  return Invoice;
};
