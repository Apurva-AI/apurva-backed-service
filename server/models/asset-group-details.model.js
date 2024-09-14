import { DataTypes } from 'sequelize';

export default {
    name:'user_group_details',
    attribute:{
        group_name:{
            type: DataTypes.TEXT,
            allowNull: true,
        },
        channel:{
            type: DataTypes.ARRAY(DataTypes.TEXT),
            allowNull: true,
        },
    }
};