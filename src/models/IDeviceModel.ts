export interface IDeviceModel {
    _id?: string;
    name: string;
    created_at: Date | number;
    updated_at?: Date | number;
}

export default IDeviceModel;
