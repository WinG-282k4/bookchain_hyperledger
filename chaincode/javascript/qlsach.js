/*
 * Chaincode Quan Ly Sach
 * Dua tren FabCar
 */
'use strict';

const { Contract } = require('fabric-contract-api');

class QLSach extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Khoi Tao Du Lieu Sach ===========');
        const sachs = [
            {
                maSach: 'S001',
                tenSach: 'Lap Trinh Blockchain',
                theLoai: 'CNTT',
                tacGia: 'Nguyen Van A',
                namXuatBan: '2023',
                soLuong: 100
            },
            {
                maSach: 'S002',
                tenSach: 'Tri Tue Nhan Tao',
                theLoai: 'CNTT',
                tacGia: 'Tran Thi B',
                namXuatBan: '2022',
                soLuong: 150
            },
            {
                maSach: 'S003',
                tenSach: 'Kinh Te Vi Mo',
                theLoai: 'Kinh Te',
                tacGia: 'Le Van C',
                namXuatBan: '2021',
                soLuong: 200
            },
            {
                maSach: 'S004',
                tenSach: 'Tieu Thuyet X',
                theLoai: 'Van Hoc',
                tacGia: 'Pham Thi D',
                namXuatBan: '2020',
                soLuong: 50
            },
            {
                maSach: 'S005',
                tenSach: 'Khoa Hoc Du Lieu',
                theLoai: 'CNTT',
                tacGia: 'Hoang Van E',
                namXuatBan: '2024',
                soLuong: 120
            }
        ];

        for (let i = 0; i < sachs.length; i++) {
            sachs[i].docType = 'sach';
            await ctx.stub.putState(sachs[i].maSach, Buffer.from(JSON.stringify(sachs[i])));
            console.info('Da them sach: ', sachs[i].maSach, ' - ', sachs[i].tenSach);
        }
        console.info('============= END : Khoi Tao Du Lieu Sach ===========');
    }

    async querySach(ctx, maSach) {
        const sachAsBytes = await ctx.stub.getState(maSach);
        if (!sachAsBytes || sachAsBytes.length === 0) {
            throw new Error(`Sach ${maSach} khong ton tai`);
        }
        console.log(sachAsBytes.toString());
        return sachAsBytes.toString();
    }

    async createSach(ctx, maSach, tenSach, theLoai, tacGia, namXuatBan, soLuong) {
        console.info('============= START : Tao Sach Moi ===========');
        const exists = await ctx.stub.getState(maSach);
        if (exists && exists.length > 0) {
            throw new Error(`Sach ${maSach} da ton tai`);
        }

        const sach = {
            docType: 'sach',
            maSach: maSach,
            tenSach: tenSach,
            theLoai: theLoai,
            tacGia: tacGia,
            namXuatBan: namXuatBan,
            soLuong: parseInt(soLuong)
        };

        await ctx.stub.putState(maSach, Buffer.from(JSON.stringify(sach)));
        console.info('============= END : Tao Sach Moi ===========');
        return JSON.stringify(sach);
    }

    async queryAllSach(ctx) {
        const startKey = '';
        const endKey = '';
        const allResults = [];
        for await (const {key, value} of ctx.stub.getStateByRange(startKey, endKey)) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: key, Record: record });
        }
        console.info(allResults);
        return JSON.stringify(allResults);
    }

    async updateSach(ctx, maSach, tenSach, theLoai, tacGia, namXuatBan, soLuong) {
        console.info('============= START : Cap Nhat Sach ===========');
        const sachAsBytes = await ctx.stub.getState(maSach);
        if (!sachAsBytes || sachAsBytes.length === 0) {
            throw new Error(`Sach ${maSach} khong ton tai`);
        }

        const sach = JSON.parse(sachAsBytes.toString());
        sach.tenSach = tenSach;
        sach.theLoai = theLoai;
        sach.tacGia = tacGia;
        sach.namXuatBan = namXuatBan;
        sach.soLuong = parseInt(soLuong);

        await ctx.stub.putState(maSach, Buffer.from(JSON.stringify(sach)));
        console.info('============= END : Cap Nhat Sach ===========');
        return JSON.stringify(sach);
    }

    async deleteSach(ctx, maSach) {
        console.info('============= START : Xoa Sach ===========');
        const exists = await ctx.stub.getState(maSach);
        if (!exists || exists.length === 0) {
            throw new Error(`Sach ${maSach} khong ton tai`);
        }
        await ctx.stub.deleteState(maSach);
        console.info('============= END : Xoa Sach ===========');
        return `Da xoa sach ${maSach}`;
    }

    async querySachByTheLoai(ctx, theLoai) {
        console.info('============= START : Tim Sach Theo The Loai ===========');
        const allSach = JSON.parse(await this.queryAllSach(ctx));
        const result = allSach.filter(item => item.Record.theLoai === theLoai);
        console.info(`Tim thay ${result.length} sach thuoc the loai ${theLoai}`);
        return JSON.stringify(result);
    }

    async updateSoLuongSach(ctx, maSach, soLuongMoi) {
        console.info('============= START : Cap Nhat So Luong Sach ===========');
        const sachAsBytes = await ctx.stub.getState(maSach);
        if (!sachAsBytes || sachAsBytes.length === 0) {
            throw new Error(`Sach ${maSach} khong ton tai`);
        }
        const sach = JSON.parse(sachAsBytes.toString());
        const soLuongCu = sach.soLuong;
        sach.soLuong = parseInt(soLuongMoi);

        await ctx.stub.putState(maSach, Buffer.from(JSON.stringify(sach)));
        console.info(`Da cap nhat so luong sach ${maSach} tu ${soLuongCu} thanh ${soLuongMoi}`);
        console.info('============= END : Cap Nhat So Luong Sach ===========');
        return JSON.stringify(sach);
    }
}

module.exports = QLSach;