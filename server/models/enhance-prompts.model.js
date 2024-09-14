import { DataTypes } from 'sequelize';

export default {
    name:'enhance_prompts',
    attribute:{
        prompts:{
            type: DataTypes.TEXT,
            allowNull: true,
        },
        section_name:{
            type: DataTypes.TEXT,
            allowNull: true,
        },
        keyword:{
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }
};