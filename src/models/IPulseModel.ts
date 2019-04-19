export interface IPulseModel {
    id?: number;
    deviceId: number;
    pulse: number;
    emitted_at: string | Date;
    created_at?: string | Date;
}

export default IPulseModel;
